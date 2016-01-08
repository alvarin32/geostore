var Commons = require('commons');
var Artist = require('geometry/artist');
var MapTools = require('./tools');
var Geo = require('geometry/geometry');
var F = require('client/fiat');

var createLayer = function () {

    var layer = {};
    var context, width, height, renderFrame;
    var geos = [];
    var size = 0, offsetLeft = 0, offsetTop = 0;
    var distance = null;
    var artist, map;
    var geoListeners = [];
    var geosHidden = false;

    layer.clear = function () {
        geos = [];
        if (context) triggerRender();
    };

    layer.onGeometry = function (listener) {
        geoListeners.push(listener);
    };

    layer.offGeometry = function (listener) {
        return Commons.removeElement(geoListeners, listener);
    };

    layer.addGeometry = function (geometry, notifyListeners) {
        if (geometry.getType() == Geo.Type.PATH && geometry.size() < 1)
            throw 'a path with no lines must not be added to the designer';
        var clone = geometry.copy();
        clone.origin = geometry;
        clone.transform(MapTools.mercator);
        clone.backup();
        panAndZoom(clone);
        geos.push(clone);
        if (context) triggerRender();
        if (notifyListeners) geoListeners.forEach(function (listener) {
            listener(geometry);
        });
    };

    layer.removeGeometry = function (geometry) {
        Commons.remove(geos, function (clone) {
            return clone.origin === geometry;
        });
        if (context) triggerRender();
    };

    layer.getGeometry = function (index) {
        index = index || 0;
        if (index >= geos.length) return null;
        var clone = geos[index];
        return clone.origin;
    };

    var showDistance = function (from, to, showCircle) {
        if (distance == null || distance.from.origin != from) {
            distance = {showCircle: showCircle};
            distance.from = from.copy().transform(MapTools.mercator).backup();
            distance.from.origin = from;
            panAndZoom(distance.from);
            distance.to = to.copy().backup();
        }
        distance.to.restore()
            .set(to.getX(), to.getY())
            .backup();
        panAndZoom(distance.to);
        if (context) triggerRender();
    };

    var hideDistance = function () {
        distance = null;
        if (context) triggerRender();
    };

    var getDistance = function (relative) {
        if (distance) {
            var deltaX = (distance.to.getX() - distance.from.getX());
            var deltaY = (distance.to.getY() - distance.from.getY());
            if (relative) {
                deltaX /= size;
                deltaY /= size;
            }
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }
    };

    layer.update = function () {
        size = map.getSize();
        offsetLeft = -map.getX() * size;
        offsetTop = -map.getY() * size;
        for (var i = 0; i < geos.length; i++) {
            var geo = geos[i];
            panAndZoom(geo);
        }
        if (distance != null) {
            panAndZoom(distance.from);
            panAndZoom(distance.to);
        }
    };

    var panAndZoom = function (geometry) {
        //revert previous changes:
        geometry.restore();
        geometry.backup();

        //zoom and pan:
        geometry.scale(size, size);
        geometry.translate(offsetLeft, offsetTop);
    };

    layer.initialize = function ($map) {
        map = $map;
        var box = map.container.box();
        var canvas = layer.canvas.raw();
        width = canvas.width = box.width;
        height = canvas.height = box.height;
        context = canvas.getContext('2d');
        artist = Artist(context);
        map.onTap(delegateTap);
        map.onHover(delegateHover);
    };

    var delegateTap = function (location, tapCount) {
        if (currentTool != null && currentTool.onTap) {
            location = snap(location);
            currentTool.onTap(location, tapCount);
            return false;
        } else {
            var nextGeometry = getNextGeometry(location);
            if (nextGeometry && nextGeometry.onTap) return nextGeometry.onTap();
            triggerRender();
        }
    };

    var hoveredGeometry;
    var delegateHover = function (location, awaitingTapOrPan) {
        if (currentTool != null && currentTool.onHover) {
            location = snap(location);
            currentTool.onHover(location, awaitingTapOrPan);
            return false;
        } else {
            var nextGeometry = getNextGeometry(location);
            if (nextGeometry != hoveredGeometry) {
                if (hoveredGeometry && hoveredGeometry.onOut) hoveredGeometry.onOut();
                hoveredGeometry = nextGeometry;
                if (hoveredGeometry && hoveredGeometry.onOver) hoveredGeometry.onOver();
                triggerRender();
                return false;
            }
        }
    };

    var LOCATION = Geo.Point.create(0, 0);
    var getNextGeometry = function (location) {
        if (!geos.length) return;
        LOCATION.set(location.x, location.y);
        var maxDistance = cmToPx(0.5);
        var min;
        geos.forEach(function (geo) {
            var distance = geo.distanceToPoint(LOCATION).pixels;
            if (distance < maxDistance && (!min || min.value > distance)) {
                min = {value: distance, geo: geo};
            }
        });
        return min && min.geo.origin;
    };

    var snap = function (origin) {
        var x = (origin.x - offsetLeft) / size;
        var y = (origin.y - offsetTop) / size;
        return Geo.Point.create(x, y);
    };

    layer.render = function () {
        renderFrame = null;
        context.clearRect(0, 0, width, height);
        if(!geosHidden){
            for (var i = 0; i < geos.length; i++) {
                var geo = geos[i];
                artist.setColor(geo.origin.color || '#303030');
                artist.setColor(geo.origin.colorBright || '#f3f3f3', true);
                artist.draw(geos[i], true);
            }
        }
        if (distance != null) renderDistance();
    };

    layer.setGeosHidden = function(hidden){
        geosHidden = hidden;
        triggerRender();
        return layer;
    };


    var triggerRender = function () {
        renderFrame = renderFrame || window.requestAnimationFrame(layer.render);
    };

    layer.triggerUpdate = triggerRender;

    var renderDistance = function () {
        var from = distance.from;
        var to = distance.to;
        if (distance.showCircle) renderDistanceCircle(from);
        renderDistanceLine(from, to);
        renderDistanceLabel(from, to);
    };

    var renderDistanceCircle = function (center) {
        var radius = getDistance();
        context.beginPath();
        context.arc(center.getX(), center.getY(), radius, 0, TWO_PI, false);
        artist.fillWithAlpha(0.6);
    };

    var DASH_LINE = cmToPx(0.2);
    var DASH_GAP = cmToPx(0.1);
    var STROKE_STRONG = Math.round(cmToPx(0.2));
    var STROKE_LIGHT = Math.round(cmToPx(0.05));
    var TWO_PI = 2 * Math.PI;
    var renderDistanceLine = function (from, to) {
        context.beginPath();
        context.moveTo(from.getX(), from.getY());
        context.lineTo(to.getX(), to.getY());
        context.lineWidth = STROKE_STRONG;
        var lineDash = context.getLineDash();
        context.setLineDash([DASH_LINE, DASH_GAP]);
        context.stroke();
        context.setLineDash(lineDash);
        artist.draw(from);
        artist.draw(to);
    };

    var renderDistanceLabel = function (from, to) {
        var latReference = ((to.getY() - from.getY()) / 2 + from.getY() - offsetTop) / size;
        var distance = getDistance();
        var meters = Math.round(distance * MapTools.metersPerPixel(latReference, size)) + 'm';
        context.fillStyle = '#303030';
        var offset = STROKE_STRONG;
        var x = to.getX() + offset;
        var y = to.getY() - offset;
        var width = context.measureText(meters).width + 2 * offset;
        var height = 20;
        roundedRect(x, y - height, width, height, offset, context);
        context.fillStyle = '#ffffff';
        context.fill();
        context.lineWidth = STROKE_LIGHT * 0.8;
        context.strokeStyle = '#303030';
        context.stroke();
        context.fillStyle = '#303030';
        context.fillText(meters, x + width / 2, y - height / 2);
    };

    var currentTool = null;
    var stopCurrentTool = function () {
        if (currentTool) {
            if (currentTool.onStop) currentTool.onStop();
            currentTool = null;
            triggerRender();
        }
    };
    var startTool = function (tool) {
        if (currentTool == tool) return;
        stopCurrentTool();
        currentTool = tool;
    };

    var createPointTool = function () {
        var tool = {};
        tool.onTap = function (location) {
            var point = location.copy();
            point.transform(MapTools.inverseMercator);
            layer.addGeometry(point, true);
            stopCurrentTool();
        };
        return tool;
    };

    var createCircleTool = function () {
        var tool = {};
        var center, radius;
        tool.onStop = function () {
            hideDistance();
            radius = null;
            if (center != null) {
                layer.removeGeometry(center);
                center = null;
            }
        };
        tool.onTap = function (location) {
            if (center == null) {
                center = location.copy();
                center.transform(MapTools.inverseMercator);
                layer.addGeometry(center);
            } else {
                radius = getDistance(true);
                if (radius > 0) {
                    layer.removeGeometry(center);
                    var distanceReference = center.copy().transform(MapTools.mercator);
                    radius = MapTools.inverseMercator.transformDistance(radius, distanceReference);
                    var circle = Geo.Circle.create(center, radius);
                    center = null;
                    layer.addGeometry(circle, true);
                }
                stopCurrentTool();
            }
        };
        tool.onHover = function (location, awaitingTapOrPan) {
            if (center != null && !awaitingTapOrPan) {
                showDistance(center, location, true);
            }
        };
        return tool;
    };


    var createPathTool = function () {
        var tool = {};
        var path;
        tool.finalize = function () {
            if (path && path.size() > 0) {
                layer.removeGeometry(path);
                if (tool.isPolygon) {
                    path.close();
                    var polygon = Geo.Polygon.create();
                    polygon.addPath(path);
                    layer.addGeometry(polygon, true);
                } else {
                    layer.addGeometry(path, true);
                }
                path = null;
            }
            stopCurrentTool();
        };
        tool.onStop = function () {
            hideDistance();
            if (path != null) {
                layer.removeGeometry(path);
                path = null;
            }
        };
        tool.onTap = function (location, tapCount) {
            if (path && tapCount > 1) {
                tool.finalize();
            } else if (path) {
                location = location.copy();
                location.transform(MapTools.inverseMercator);
                layer.removeGeometry(path);
                path.lineTo(location);
                layer.addGeometry(path);
            } else {
                location = location.copy();
                location.transform(MapTools.inverseMercator);
                path = Geo.Path.create();
                path.moveTo(location);
                layer.addGeometry(path);
            }
        };
        tool.onHover = function (location, awaitingTapOrPan) {
            if (path && !awaitingTapOrPan) {
                var pointer = path.getPointer();
                showDistance(pointer, location);
            }
        };
        return tool;
    };
    var createPolygonTool = function () {
        var tool = createPathTool();
        tool.isPolygon = true;
        return tool;
    };


    var wrapTool = function (tool) {
        return function () {
            startTool(tool);
        };
    };

    layer.point = wrapTool(createPointTool());
    layer.circle = wrapTool(createCircleTool());
    layer.path = wrapTool(createPathTool());
    layer.polygon = wrapTool(createPolygonTool());
    layer.stop = stopCurrentTool;

    return layer;
};


var roundedRect = function (x, y, w, h, r, context) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
    return this;
};

module.exports = {
    layer: createLayer
};