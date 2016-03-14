var Geometries = require('./geometries');
var Geo = require('geometry');
var MapTools = require('map/tools');

var createLayer = function (map) {

    var geometries = Geometries.layer(map);

    var constructPoint = function (onDone) {
        var point = Geo.Point.create(0, 0);

        var onTap = function (origin, tapCount) {
            map.toLocation(origin.x, origin.y, point);
            if (tapCount == 1) return stop();
        };

        var onHover = function (origin) {
            map.toLocation(origin.x, origin.y, point);
            geometries.removeGeo(point).addGeo(point);
            point.label = point.getX().toPrecision(4) + '/' + point.getY().toPrecision(4);
            return false;
        };

        map.on('tap', onTap).on('hover', onHover);

        var stop = function (canceled) {
            map.off(onTap).off(onHover);
            delete point.label;
            geometries.removeGeo(point);
            !canceled && onDone(point);
        }

        return stop.bind(this, true);
    };

    var constructLine = function (onDone, initialStart, hoverHook) {

        var onStarted = function (start) {
            var stop = start.copy();
            var line = Geo.Line.create(start, stop);
            line.style = {lineDash: [cmToPx(0.2), cmToPx(0.1)]};

            var onTap = function (origin, tapCount) {
                map.toLocation(origin.x, origin.y, stop);
                if (tapCount == 1) return doStop();
            };

            var onHover = function (origin, wait) {
                if (wait) return false;
                map.toLocation(origin.x, origin.y, stop);
                stop.label = computeDistance(start, stop);
                if (hoverHook) hoverHook(line);
                geometries.removeGeo(line).addGeo(line).removeGeo(stop).addGeo(stop);
                return false;
            };

            map.on('tap', onTap).on('hover', onHover);
            var doStop = function (canceled) {
                map.off(onTap).off(onHover);
                delete line.style;
                delete stop.label;
                geometries.removeGeo(stop).removeGeo(line);
                !canceled && onDone(line);
                return false;
            };

            currentCancel = doStop.bind(this, true);
        };


        var currentCancel;
        if (initialStart) onStarted(initialStart)
        else currentCancel = constructPoint(onStarted);

        return function () {
            currentCancel();
        };
    };

    var constructPath = function (onDone) {
        var path = Geo.Path.create();

        var currentCancel;

        currentCancel = constructPoint(function (point) {
            path.moveTo(point);
            constructLines(point);
        });

        var constructLines = function (start) {
            currentCancel = constructLine(function (line) {
                var stop = line.getStop();
                path.lineTo(stop);
                geometries.removeGeo(path).addGeo(path);
                constructLines(stop);
            }, start);
        };

        var onTap = function (origin, tapCount) {
            if (tapCount == 2 && path.size() > 0) return stop();
        };

        map.on('tap', onTap);
        var stop = function (canceled) {
            currentCancel();
            map.off(onTap);
            geometries.removeGeo(path);
            !canceled && onDone(path);
            return false;
        };

        return stop.bind(this, true);

    };

    var constructPolygon = function (onDone) {
        var polygon = Geo.Polygon.create();

        var currentCancel;

        (function constructPaths() {
            currentCancel = constructPath(function (path) {
                polygon.addPath(path.close());
                geometries.removeGeo(polygon).addGeo(polygon);
                constructPaths();
            });
        })();

        var onTap = function (origin, tapCount) {
            if (tapCount == 3) return stop();
        };

        map.on('tap', onTap);
        var stop = function (canceled) {
            map.off(onTap);
            currentCancel();
            geometries.removeGeo(polygon);
            !canceled && onDone(polygon);
            return false;
        };

        return stop.bind(this, true);
    };

    var constructBox = function (onDone) {
        var box;

        var updateBox = function (line) {
            box = box || Geo.Box.create(line.getStart(), line.getStop());
            geometries.removeGeo(box).addGeo(box);
        };

        var onLineDone = function (line) {
            updateBox(line);
            stop();
        };

        var cancelLine = constructLine(onLineDone, null, updateBox);

        var stop = function (canceled) {
            cancelLine();
            if (box) {
                delete box.style;
                geometries.removeGeo(box);
            }
            !canceled && onDone(box);
        };

        return stop.bind(this, true);
    };

    var constructCircle = function (onDone) {
        var circle;

        var updateCircle = function (line) {
            circle = circle || Geo.Circle.create(line.getStart(), line.getStop());
            geometries.removeGeo(circle).addGeo(circle);
        };

        var onLineDone = function (line) {
            updateCircle(line);
            stop();
        };

        var cancelLine = constructLine(onLineDone, null, updateCircle);

        var stop = function (canceled) {
            cancelLine();
            if (circle) {
                delete circle.style;
                geometries.removeGeo(circle);
            }
            !canceled && onDone(circle);
        };

        return stop.bind(this, true);
    };


    return {
        point: constructPoint,
        line: constructLine,
        path: constructPath,
        polygon: constructPolygon,
        box: constructBox,
        circle: constructCircle
    };

}


module.exports = {
    layer: createLayer
};


var computeDistance = function (from, to) {
    var lat1 = from.getY();
    var lon1 = from.getX();
    var lat2 = to.getY();
    var lon2 = to.getX();

    var distance = MapTools.computeDistance(lat1, lon1, lat2, lon2);

    if (distance > 1000) {
        distance = distance / 1000;
        return (Math.round(distance * 10) / 10) + 'km';
    }

    return Math.round(distance) + 'm';
};