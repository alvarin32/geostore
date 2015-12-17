var F = require('client/fiat');
var Animator = require('client/animation');
var Geo = require('geometry');
var Touches = require('client/touches');
var Tools = require('./tools');
var Commons = require('commons');

var create = function () {
    var map = {};

    map.container = F.node('div').style({
        cursor: 'pointer',
        position: 'relative'
    });

    var position, zoom;
    var renderFrame;
    var layers = [];
    var width, height;
    var minZoom;


    map.getSize = function () {
        return zoom * zoom;
    };

    map.getX = function () {
        return position.x;
    };

    map.getY = function () {
        return position.y;
    };

    map.toLocation = function (x, y, location) {
        location = location || Geo.Point.create(x, y);
        var size = map.getSize();
        return location
            .set(position.x + x / size, position.y + y / size)
            .transform(Tools.inverseMercator);
    };

    map.getBox = function (box) {
        var mapSize = map.getSize();
        return box.setBox(position.x, position.y, width / mapSize, height / mapSize);
    };

    var clipZoom = function (z) {
        return Math.max(minZoom, z);
    };

    var clipX = function (x, mapSize) {
        var minX = 0;
        var maxX = 1 - width / mapSize;
        return Math.max(minX, Math.min(maxX, x));
    };

    var clipY = function (y, mapSize) {
        var minY = 0;
        var maxY = 1 - height / mapSize;
        return Math.max(minY, Math.min(maxY, y));
    };

    var triggerRender = function () {
        renderFrame = renderFrame || window.requestAnimationFrame(render);
    };

    var render = function () {
        renderFrame = null;
        for (var i = 0; i < layers.length; i++) {
            layers[i].render();
        }
    };

    var update = function () {
        var i;
        for (i = 0; i < layers.length; i++) {
            layers[i].update();
        }
        for (i = 0; i < updateListeners.length; i++) {
            updateListeners[i]();
        }
        triggerRender();
    };

    var createCanvas = function () {
        return F.node('canvas').style({
            position: 'absolute',
            left: 0, top: 0,
            width: '100%', height: '100%'
        });
    };

    map.addLayer = function (layer) {
        layer.canvas = createCanvas();
        layers.push(layer);
        map.container.append(layer.canvas);
        if (map.attached) {
            updateLayersCanvas(layer);
            layer.initialize(map);
            layer.update();
            window.requestAnimationFrame(layer.render);
        }
        return map;
    };

    map.removeLayer = function (layer) {
        Commons.removeElement(layers, layer);
        layer.canvas.remove();
        return map;
    };

    var glideAnimation;
    var glideOnSwipe = function (velocity) {
        var right = velocity.xpms > 0;
        var down = velocity.ypms > 0;
        var last = (new Date()).getTime();
        var xDone = false;
        var yDone = false;
        var animated = {
            doLoop: function (now) {
                var elapsed = (now - last);
                last = now;
                var mapSize = map.getSize();
                if (!xDone) {
                    var deltaX = elapsed * velocity.xpms;
                    position.x = clipX(position.x - (deltaX / mapSize), mapSize);
                    velocity.xpms -= (elapsed * 0.005) * velocity.xpms;
                    xDone = (right != (velocity.xpms > 0)) || Math.abs(velocity.xpms) < 0.01;
                }
                if (!yDone) {
                    var deltaY = elapsed * velocity.ypms;
                    position.y = clipY(position.y - (deltaY / mapSize), mapSize);
                    velocity.ypms -= (elapsed * 0.005) * velocity.ypms;
                    yDone = (down != (velocity.ypms > 0)) || Math.abs(velocity.ypms) < 0.01;
                }
                update();
                return xDone && yDone;
            }
        };
        if (glideAnimation) glideAnimation.cancel();
        glideAnimation = Animator.loop(animated);
    };

    var glideTo = function (targetZoom, targetCenter) {
        var animated = {
            from: 0, to: 1, duration: 2000, onTick: function (value) {
                var mapSize = map.getSize();
                var pixelsToGoX = width / 2 - (targetCenter.x - position.x) * mapSize;
                var pixelsToGoY = height / 2 - (targetCenter.y - position.y) * mapSize;
                zoom = clipZoom(zoom + (targetZoom - zoom) * value * value);
                mapSize = map.getSize();
                position.x = clipX(targetCenter.x - (width / 2 - (pixelsToGoX * (1 - value))) / mapSize, mapSize);
                position.y = clipY(targetCenter.y - (height / 2 - (pixelsToGoY * (1 - value))) / mapSize, mapSize);
                update();
            },
            onDone: function () {
                glideAnimation = null;
            }
        };
        if (glideAnimation != null) glideAnimation.cancel();
        glideAnimation = Animator.start(animated);
    };

    map.goTo = function (targetZoom, targetCenter, glide) {
        if (glide) {
            glideTo(targetZoom, targetCenter);
        } else {
            zoom = clipZoom(targetZoom);
            var mapSize = map.getSize();
            position.x = clipX(targetCenter.x - (width / 2) / mapSize, mapSize);
            position.y = clipY(targetCenter.y - (height / 2) / mapSize, mapSize);
            update();
        }
    };

    var minSize = 1 / (1 << 17);
    var goToBox = function (box, glide) {
        var boxWidth = box.getWidth() == 0 ? minSize : box.getWidth();
        var boxHeight = box.getHeight() == 0 ? minSize : box.getHeight();
        var zoomToFitWidth = Math.sqrt((width - cmToPx(1)) / boxWidth);
        var zoomToFitHeight = Math.sqrt((height - cmToPx(1)) / boxHeight);
        var targetZoom = Math.min(zoomToFitWidth, zoomToFitHeight);
        var targetCenter = {
            x: box.getLeft() + box.getWidth() / 2,
            y: box.getTop() + box.getHeight() / 2
        };
        map.goTo(targetZoom, targetCenter, glide);
    };

    map.goToGeo = function (geo, glide) {
        geo = geo.copy().transform(Tools.mercator);
        var box = Geo.Box.empty();
        geo.computeBoundingBox(box);
        goToBox(box, glide);
    };

    map.goToUser = function (glide) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                position = position.coords;
                var lat = position.latitude;
                var lon = position.longitude;
                var center = Geo.Point.create(lon, lat);
                map.goToGeo(center, glide);
            });
        }
    };

    var awaitingTapOrPan = false;
    Touches.listen(map.container, {
            onWheel: function (location, delta) {
                var oldMapSize = map.getSize();
                zoom = clipZoom(zoom + zoom * delta * 0.04);
                var newMapSize = map.getSize();
                var scale = (1 / oldMapSize - 1 / newMapSize);
                position.x = clipX(position.x + location.x * scale, newMapSize);
                position.y = clipY(position.y + location.y * scale, newMapSize);
                update();
                return false;
            },
            onPan: function (origin, from, to) {
                awaitingTapOrPan = false;
                var deltaX = from.x - to.x;
                var deltaY = from.y - to.y;
                var mapSize = map.getSize();
                position.x = clipX(position.x + (deltaX / mapSize), mapSize);
                position.y = clipY(position.y + (deltaY / mapSize), mapSize);
                update();
                return false;
            },
            onSwipe: function (origin, velocity) {
                glideOnSwipe(velocity);
            },
            onDown: function () {
                awaitingTapOrPan = true;
                if (glideAnimation) glideAnimation.cancel();
            },
            onTap: function (origin, tapCount) {
                awaitingTapOrPan = false;
                for (var i = tapListeners.length - 1; i >= 0; i--) {
                    if (tapListeners[i](origin, tapCount) == false) return false;
                }
            },
            onHover: function (origin) {
                for (var i = hoverListeners.length - 1; i >= 0; i--) {
                    if (hoverListeners[i](origin, awaitingTapOrPan) == false) return false;
                }
            }
        }
    );

    var tapListeners = [];
    var hoverListeners = [];
    var updateListeners = [];

    map.onTap = function (listener) {
        tapListeners.push(listener);
    };

    map.onHover = function (listener) {
        hoverListeners.push(listener);
    };

    map.onUpdate = function (listener) {
        updateListeners.push(listener);
    };

    var synchronizeSize = function () {
        var box = map.container.box();
        width = box.width;
        height = box.height;
        minZoom = Math.sqrt(Math.max(width, height));
        layers.forEach(function (layer) {
            updateLayersCanvas(layer, box);
        });
    };

    var updateLayersCanvas = function (layer, box) {
        box = box || map.container.box();
        var canvas = layer.canvas;
        var raw = canvas.raw();
        layer.width = raw.width = box.width;
        layer.height = raw.height = box.height;
        layer.context = layer.context || raw.getContext('2d');
    };

    map.container.onAttached(function () {
        synchronizeSize();
        zoom = clipZoom(1);
        var mapSize = map.getSize();
        position = {x: clipX(0.2, mapSize), y: clipY(0.2, mapSize)};
        layers.forEach(function (layer) {
            layer.initialize(map);
        });
        map.attached = true;
        update();
    });

    map.onResize = function () {
        synchronizeSize();
        update();
    };

    map.triggerUpdate = update;

    return map;
};


module.exports = {
    create: create
};