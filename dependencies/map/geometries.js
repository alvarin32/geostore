var Commons = require('commons');
var Artist = require('geometry/artist');
var MapTools = require('./tools');
var Geo = require('geometry/geometry');
var F = require('client/fiat');

var createLayer = function (map) {

    var layer = {};
    var canvas = map.attachCanvas();
    var context, width, height, renderFrame;
    var geos = [];
    var size = 0, offsetLeft = 0, offsetTop = 0;
    var artist;

    layer.clear = function () {
        geos = [];
        triggerRender();
    };

    layer.addGeo = function (geometry) {
        var clone = geometry.copy();
        clone.origin = geometry;
        clone.transform(MapTools.mercator);
        panAndZoom(clone);
        geos.push(clone);
        triggerRender();
        return layer;
    };

    layer.removeGeo = function (geometry) {
        Commons.remove(geos, function (clone) {
            return clone.origin === geometry;
        });
        triggerRender();
        return layer;
    };

    layer.update = function () {
        triggerRender();
        return layer;
    }

    var panAndZoom = function (geometry) {
        //revert previous changes:
        geometry.restore();
        geometry.backup();

        //zoom and pan:
        geometry.scale(size, size);
        geometry.translate(offsetLeft, offsetTop);
    };

    var onTap = function (location, tapCount) {
        var nextGeometry = getNextGeometry(location);
        if (nextGeometry && nextGeometry.onTap) {
            triggerRender();
            return nextGeometry.onTap();
        }
    };

    var hoveredGeometry;
    var onHover = function (location, awaitingTapOrPan) {
        var nextGeometry = getNextGeometry(location);
        if (nextGeometry != hoveredGeometry) {
            if (hoveredGeometry && hoveredGeometry.onOut) hoveredGeometry.onOut();
            hoveredGeometry = nextGeometry;
            if (hoveredGeometry && hoveredGeometry.onOver) hoveredGeometry.onOver();
            triggerRender();
            return false;
        }
    };

    var SNAP_DISTANCE = cmToPx(0.5);
    var LOCATION = Geo.Point.create(0, 0);
    var getNextGeometry = function (location) {
        if (!geos.length) return;
        LOCATION.set(location.x, location.y);
        var min;
        geos.forEach(function (geo) {
            var distance = geo.containsPoint(LOCATION) ? 0 : geo.distanceToPoint(LOCATION).pixels;
            var origin = geo.origin;
            var maxDistance = (origin.snapDistance != undefined) ? origin.snapDistance : SNAP_DISTANCE;
            if (distance <= maxDistance && (!min || min.value > distance)) {
                min = {value: distance, geo: geo};
            }
        });
        return min && min.geo.origin;
    };

    var triggerRender = function () {
        if (!context) return;
        renderFrame = renderFrame || window.requestAnimationFrame(doRender);
    };

    var doRender = function () {
        renderFrame = null;
        context.clearRect(0, 0, width, height);
        geos.forEach(renderGeo);
    };

    var renderGeo = function (geo) {
        if (geo.origin.hidden) return;
        artist.draw(geo);
    };

    var initializeContext = function () {
        var raw = canvas.raw();
        var box = canvas.box();
        width = raw.width = box.width;
        height = raw.height = box.height;
        context = raw.getContext('2d');
        artist = Artist(context);
        triggerRender();
    };

    map.on('update', function () {
        size = map.getSize();
        offsetLeft = -map.getX() * size;
        offsetTop = -map.getY() * size;
        geos.forEach(panAndZoom);
        triggerRender();
    });
    canvas.onAttached(initializeContext);
    map.on('resize', initializeContext);
    map.on('tap', onTap);
    map.on('hover', onHover);

    return layer;
};


module.exports = {
    layer: createLayer
};