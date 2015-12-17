var geo = require('./geometry');


var matrix = {};
var pointMatrix = {};
pointMatrix[geo.Type.POINT] = function (a, b) {
    return a.containsPoint(b);
};
pointMatrix[geo.Type.CIRCLE] = function (point, circle) {
    return circle.containsPoint(point);
};
pointMatrix[geo.Type.BOX] = function (point, box) {
    return box.containsPoint(point);
};
pointMatrix[geo.Type.LINE] = function (point, line) {
    return line.containsPoint(point);
};
pointMatrix[geo.Type.PATH] = function (point, path) {
    return path.containsPoint(point);
};
pointMatrix[geo.Type.POLYGON] = function (point, polygon) {
    return polygon.containsPoint(point);
};


var circleMatrix = {};
circleMatrix[geo.Type.POINT] = function (circle, point) {
    return circle.containsPoint(point);
};
circleMatrix[geo.Type.CIRCLE] = function (circle, other) {
    return circle.intersectsGeometry(other);
};
circleMatrix[geo.Type.BOX] = function (circle, other) {
    return circle.intersectsGeometry(other);
};
circleMatrix[geo.Type.LINE] = function (circle, other) {
    return circle.intersectsGeometry(other);
};
circleMatrix[geo.Type.PATH] = function (circle, other) {
    return circle.intersectsGeometry(other);
};
circleMatrix[geo.Type.POLYGON] = function (circle, other) {
    return circle.intersectsGeometry(other);
};


var boxMatrix = {};
boxMatrix[geo.Type.POINT] = function (box, point) {
    return box.containsPoint(point);
};
boxMatrix[geo.Type.CIRCLE] = function (box, circle) {
    return circle.intersectsGeometry(box);
};
boxMatrix[geo.Type.BOX] = function (box, other) {
    return box.intersectsBox(other);
};
boxMatrix[geo.Type.LINE] = function (box, line) {
    return line.intersectsBox(box);
};
boxMatrix[geo.Type.PATH] = function (box, path) {
    return path.intersectsBox(box);
};
boxMatrix[geo.Type.POLYGON] = function (box, polygon) {
    return polygon.intersectsBox(box);
};


var lineMatrix = {};
lineMatrix[geo.Type.POINT] = function (line, point) {
    return line.containsPoint(point);
};
lineMatrix[geo.Type.CIRCLE] = function (line, circle) {
    return circle.intersectsGeometry(line);
};
lineMatrix[geo.Type.BOX] = function (line, box) {
    return line.intersectsBox(box);
};
lineMatrix[geo.Type.LINE] = function (line, other) {
    return line.intersectsLine(other);
};
lineMatrix[geo.Type.PATH] = function (line, path) {
    return path.intersectsLine(line);
};
lineMatrix[geo.Type.POINT] = function (line, polygon) {
    return polygon.intersectsLine(line);
};


var pathMatrix = {};
pathMatrix[geo.Type.POINT] = function (path, point) {
    return path.containsPoint(point);
};
pathMatrix[geo.Type.CIRCLE] = function (path, circle) {
    return circle.intersectsGeometry(path);
};
pathMatrix[geo.Type.BOX] = function (path, box) {
    return path.intersectsBox(box);
};
pathMatrix[geo.Type.LINE] = function (path, line) {
    return path.intersectsLine(line);
};
pathMatrix[geo.Type.PATH] = function (path, other) {
    return path.intersectsPath(other);
};
pathMatrix[geo.Type.POLYGON] = function (path, polygon) {
    return polygon.intersectsPath(path);
};


var polygonMatrix = {};
polygonMatrix[geo.Type.POINT] = function (polygon, point) {
    return polygon.containsPoint(point);
};
polygonMatrix[geo.Type.CIRCLE] = function (polygon, circle) {
    return circle.intersectsGeometry(polygon);
};
polygonMatrix[geo.Type.BOX] = function (polygon, box) {
    return polygon.intersectsBox(box);
};
polygonMatrix[geo.Type.LINE] = function (polygon, line) {
    return polygon.intersectsLine(line);
};
polygonMatrix[geo.Type.PATH] = function (polygon, path) {
    return polygon.intersectsPath(path);
};
polygonMatrix[geo.Type.POLYGON] = function (polygon, other) {
    return polygon.intersectsPolygon(other);
};

matrix[geo.Type.POINT] = pointMatrix;
matrix[geo.Type.CIRCLE] = circleMatrix;
matrix[geo.Type.BOX] = boxMatrix;
matrix[geo.Type.LINE] = lineMatrix;
matrix[geo.Type.PATH] = pathMatrix;
matrix[geo.Type.POLYGON] = polygonMatrix;
var intersectionMatrix = matrix;


//
//
//
//


matrix = {};
pointMatrix = {};
pointMatrix[geo.Type.POINT] = function (a, b) {
    return a.distanceToPoint(b);
};
pointMatrix[geo.Type.CIRCLE] = function (point, circle) {
    return circle.distanceToPoint(point);
};
pointMatrix[geo.Type.BOX] = function (point, box) {
    return box.distanceToPoint(point);
};
pointMatrix[geo.Type.LINE] = function (point, line) {
    return line.distanceToPoint(point);
};
pointMatrix[geo.Type.PATH] = function (point, path) {
    return path.distanceToPoint(point);
};
pointMatrix[geo.Type.POLYGON] = function (point, polygon) {
    return polygon.distanceToPoint(point);
};


circleMatrix = {};
circleMatrix[geo.Type.POINT] = function (circle, point) {
    return circle.distanceToPoint(point);
};
circleMatrix[geo.Type.CIRCLE] = function (circle, other) {
    return circle.distanceToGeometry(other);
};
circleMatrix[geo.Type.BOX] = function (circle, other) {
    return circle.distanceToGeometry(other);
};
circleMatrix[geo.Type.LINE] = function (circle, other) {
    return circle.distanceToGeometry(other);
};
circleMatrix[geo.Type.PATH] = function (circle, other) {
    return circle.distanceToGeometry(other);
};
circleMatrix[geo.Type.POLYGON] = function (circle, other) {
    return circle.distanceToGeometry(other);
};


boxMatrix = {};
boxMatrix[geo.Type.POINT] = function (box, point) {
    return box.distanceToPoint(point);
};
boxMatrix[geo.Type.CIRCLE] = function (box, circle) {
    return circle.distanceToGeometry(box);
};
boxMatrix[geo.Type.BOX] = function (box, other) {
    return box.distanceToBox(other);
};
boxMatrix[geo.Type.LINE] = function (box, line) {
    return line.distanceToBox(box);
};
boxMatrix[geo.Type.PATH] = function (box, path) {
    return path.distanceToBox(box);
};
boxMatrix[geo.Type.POLYGON] = function (box, polygon) {
    return polygon.distanceToBox(box);
};


lineMatrix = {};
lineMatrix[geo.Type.POINT] = function (line, point) {
    return line.distanceToPoint(point);
};
lineMatrix[geo.Type.CIRCLE] = function (line, circle) {
    return circle.distanceToGeometry(line);
};
lineMatrix[geo.Type.BOX] = function (line, box) {
    return line.distanceToBox(box);
};
lineMatrix[geo.Type.LINE] = function (line, other) {
    return line.distanceToLine(other);
};
lineMatrix[geo.Type.PATH] = function (line, path) {
    return path.distanceToLine(line);
};
lineMatrix[geo.Type.POINT] = function (line, polygon) {
    return polygon.distanceToLine(line);
};


pathMatrix = {};
pathMatrix[geo.Type.POINT] = function (path, point) {
    return path.containsPoint(point);
};
pathMatrix[geo.Type.CIRCLE] = function (path, circle) {
    return circle.distanceToGeometry(path);
};
pathMatrix[geo.Type.BOX] = function (path, box) {
    return path.distanceToBox(box);
};
pathMatrix[geo.Type.LINE] = function (path, line) {
    return path.distanceToLine(line);
};
pathMatrix[geo.Type.PATH] = function (path, other) {
    return path.distanceToPath(other);
};
pathMatrix[geo.Type.POLYGON] = function (path, polygon) {
    return polygon.distanceToPath(path);
};


polygonMatrix = {};
polygonMatrix[geo.Type.POINT] = function (polygon, point) {
    return polygon.containsPoint(point);
};
polygonMatrix[geo.Type.CIRCLE] = function (polygon, circle) {
    return circle.distanceToGeometry(polygon);
};
polygonMatrix[geo.Type.BOX] = function (polygon, box) {
    return polygon.distanceToBox(box);
};
polygonMatrix[geo.Type.LINE] = function (polygon, line) {
    return polygon.distanceToLine(line);
};
polygonMatrix[geo.Type.PATH] = function (polygon, path) {
    return polygon.distanceToPath(path);
};
polygonMatrix[geo.Type.POLYGON] = function (polygon, other) {
    return polygon.distanceToPolygon(other);
};

matrix[geo.Type.POINT] = pointMatrix;
matrix[geo.Type.CIRCLE] = circleMatrix;
matrix[geo.Type.BOX] = boxMatrix;
matrix[geo.Type.LINE] = lineMatrix;
matrix[geo.Type.PATH] = pathMatrix;
matrix[geo.Type.POLYGON] = polygonMatrix;
var distanceMatrix = matrix;


var distance = function (a, b) {
    var typeA = a.getType();
    var typeB = b.getType();
    var method = distanceMatrix[typeA][typeB];
    return method(a, b);
};

var intersect = function (a, b) {
    if (!boundingIntersect(a, b)) {
        return false;
    }
    var typeA = a.getType();
    var typeB = b.getType();
    var method = intersectionMatrix[typeA][typeB];
    return method(a, b);
};

var boxA = geo.Box.empty();
var boxB = geo.Box.empty();

var boundingIntersect = function (a, b) {
    a.computeBoundingBox(boxA);
    b.computeBoundingBox(boxB);
    return boxA.intersectsBox(boxB);
};

var fromGeoJson = function (json) {
    switch (json.type.toLowerCase()) {
        case "point":
            return geo.Point.fromGeoJson(json);
        case "circle":
            return geo.Circle.fromGeoJson(json);
        case "envelope":
            return geo.Box.fromGeoJson(json);
        case "multipoint":
            return geo.Line.fromGeoJson(json);
        case "linestring":
            return geo.Path.fromGeoJson(json);
        case "polygon":
            return geo.Polygon.fromGeoJson(json);
    }
    throw "unsupported GeoJson-Type: " + json.type;
};


var BOX = geo.Box.empty();
var computeCenter = function (geometry) {
    var type = geometry.getType();
    if (type == geo.Type.POINT) {
        return [geometry.getX(), geometry.getY()];
    } else if (type == geo.Type.POLYGON) {
        return computeCenterOfPolygon(geometry);
    } else if (type == geo.Type.CIRCLE) {
        var center = geometry.getCenter();
        return [center.getX(), center.getY()];
    } else if (type == geo.Type.BOX) {
        return [geometry.getLeft() + geometry.getWidth() / 2,
            geometry.getTop() + geometry.getHeight() / 2];
    } else if (type == geo.Type.PATH) {
        var middleIndex = Math.floor((geometry.size() + 1) / 2) - 1;
        var middle = geometry.get(middleIndex);
        middle = middle.getStart();
        return [middle.getX(), middle.getY()];
    }

    throw 'unsupported geo-type to compute center: ' + type;
};

var computeCenterOfPolygon = function (polygon) {
    polygon.computeBoundingBox(BOX);
    var center = null;
    var numberOfProbes = 0;
    var left = BOX.getLeft();
    var top = BOX.getTop();
    var width = BOX.getWidth();
    var height = BOX.getHeight();
    for (var i = 0; i < 100; i++) {
        var x = left + Math.random() * width;
        var y = top + Math.random() * height;
        if (polygon.contains(x, y)) {
            if (center) {
                var ratio = 1 / numberOfProbes;
                center[0] = (1 - ratio) * center[0] + ratio * x;
                center[1] = (1 - ratio) * center[1] + ratio * y;
            } else {
                center = [x, y];
            }
            numberOfProbes++;
        }
    }
    if (!center) center = [left + width / 2, y + height / 2];
    return center;
};


module.exports = {
    fromGeoJson: fromGeoJson,
    intersect: intersect,
    distance: distance,
    computeCenter: computeCenter
};


