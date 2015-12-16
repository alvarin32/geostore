var euclidean = function (x1, y1, x2, y2) {
    var deltaX = x1 - x2;
    var deltaY = y1 - y2;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

// a cross b = |a|*|b|*sin(ab)  (see law of cosines (but use sine instead of cosine))
var crossProduct = function (x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
};

//http://stackoverflow.com/a/565282/909962
var distanceLineLine = function (s1X, s1Y, e1X, e1Y, s2X, s2Y, e2X, e2Y) {
    var thisDeltaX = e1X - s1X;
    var thisDeltaY = e1Y - s1Y;
    var thatDeltaX = e2X - s2X;
    var thatDeltaY = e2Y - s2Y;
    var deltaX = s1X - s2X;
    var deltaY = s1Y - s2Y;
    var denominator = crossProduct(thisDeltaX, thisDeltaY, thatDeltaX, thatDeltaY);
    var thisNominator = crossProduct(deltaX, deltaY, thatDeltaX, thatDeltaY);
    var thatNominator = crossProduct(deltaX, deltaY, thisDeltaX, thisDeltaY);
    var intersectionOnThis = Math.abs(denominator) > Math.abs(thisNominator);
    var intersectionOnThat = Math.abs(denominator) > Math.abs(thatNominator);
    var thisRatio, thatRatio;
    if (intersectionOnThis && intersectionOnThat) {
        thisRatio = (thisNominator / denominator);
        var x = s1X + thisRatio * thisDeltaX;
        var y = s1Y + thisRatio * thisDeltaY;
        return distance(x, y, x, y, 0);
    } else if (intersectionOnThis) {
        thatRatio = thatNominator / denominator;
        return (thatRatio > 0)
            ? distancePointLine(e2X, e2Y, s1X, s1Y, e1X, e1Y)
            : distancePointLine(s2X, s2Y, s1X, s1Y, e1X, e1Y);
    } else if (intersectionOnThat) {
        thisRatio = thisNominator / denominator;
        return (thisRatio > 0)
            ? distancePointLine(e1X, e1Y, s2X, s2Y, e2X, e2Y)
            : distancePointLine(s1X, s1Y, s2X, s2Y, e2X, e2Y);
    } else {
        thatRatio = thatNominator / denominator;
        thisRatio = thisNominator / denominator;
        return minDistance2(
            (thatRatio > 0)
                ? distancePointLine(e2X, e2Y, s1X, s1Y, e1X, e1Y)
                : distancePointLine(s2X, s2Y, s1X, s1Y, e1X, e1Y),
            (thisRatio > 0)
                ? distancePointLine(e1X, e1Y, s2X, s2Y, e2X, e2Y)
                : distancePointLine(s1X, s1Y, s2X, s2Y, e2X, e2Y));
    }
};

//http://paulbourke.net/geometry/pointlineplane/
var distancePointLine = function (pX, pY, sX, sY, eX, eY) {
    var deltaX = eX - sX;
    var deltaY = eY - sY;
    if (deltaX == 0 && deltaY == 0) {
        return distance(pX, pY, sX, sY);
    }
    var u = ((pX - sX) * deltaX
        + (pY - sY) * deltaY) / (deltaX * deltaX + deltaY * deltaY);
    if (u <= 0) {
        return distance(pX, pY, sX, sY);
    }
    if (u >= 1) {
        return distance(pX, pY, eX, eY);
    }
    var projectedX = sX + (u * deltaX);
    var projectedY = sY + (u * deltaY);
    return distance(pX, pY, projectedX, projectedY);
};

var within = function (value, boundA, boundB) {
    return (value < boundA) != (value < boundB);
};

var intersects = function (s1, e1, s2, e2) {
    return Math.max(s1, s2) <= Math.min(e1, e2);
};

var Type = {
    POINT: "POINT",
    LINE: "LINE",
    BOX: "BOX",
    CIRCLE: "CIRCLE",
    PATH: "PATH",
    POLYGON: "POLYGON"
};

var Markable = function () {
    var markable = {mark: null};
    markable.markAs = function (mark) {
        markable.mark = mark;
        return markable;
    };
    markable.isMarkedAs = function (mark) {
        return markable.mark === mark;
    };
    return markable;
};

var Point = {
    create: function (x, y) {
        var point = Markable();
        var backup = [];

        point.x = x;
        point.y = y;
        point.getX = function () {
            return x;
        };
        point.getY = function () {
            return y;
        };
        point.equals = function (other) {
            return x == other.getX() && y == other.getY();
        };
        point.setMin = function ($x, $y) {
            x = Math.min(x, $x);
            y = Math.min(y, $y);
        };
        point.setMax = function ($x, $y) {
            x = Math.max(x, $x);
            y = Math.max(y, $y);
        };
        point.set = function ($x, $y) {
            x = $x;
            y = $y;
            return point;
        };
        point.clipX = function (min, max) {
            x = Math.min(Math.max(x, min), max);
            return point;
        };
        point.clipY = function (min, max) {
            y = Math.min(Math.max(y, min), max);
            return point;
        };
        point.backup = function () {
            backup.push(x);
            backup.push(y);
            return point;
        };
        point.restore = function () {
            y = backup.pop();
            x = backup.pop();
            return point;
        };
        point.translate = function (deltaX, deltaY) {
            x += deltaX;
            y += deltaY;
            return point;
        };
        point.translateAndMark = function (deltaX, deltaY, mark) {
            if (!point.isMarkedAs(mark)) {
                point.markAs(mark);
                point.translate(deltaX, deltaY);
            }
            return point;
        };
        point.scale = function (scaleX, scaleY) {
            x *= scaleX;
            y *= scaleY;
            return point;
        };
        point.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!point.isMarkedAs(mark)) {
                point.markAs(mark);
                point.scale(scaleX, scaleY);
            }
            return point;
        };
        point.transform = function (transformation) {
            transformation.transformPoint(point);
            return point;
        };
        point.transformAndMark = function (transformation, mark) {
            if (!point.isMarkedAs(mark)) {
                point.markAs(mark);
                transformation.transformPoint(point);
            }
            return point;
        };
        point.getType = function () {
            return Type.POINT;
        };
        point.toJson = function () {
            return [x, y];
        };
        point.toGeoJson = function () {
            return {
                type: "Point",
                coordinates: point.toJson()
            };
        };
        point.copy = function () {
            return Point.create(x, y);
        };
        point.toString = function () {
            return '(' + x + '/' + y + ')';
        };

        //
        point.distanceTo = function (otherX, otherY) {
            return distance(x, y, otherX, otherY);
        };
        point.distanceToPoint = function (other) {
            return distance(x, y, other.getX(), other.getY());
        };
        point.containsPoint = function (other) {
            return x == other.getX() && y == other.getY();
        };
        point.computeBoundingBox = function (box) {
            return box.set(point, point);
        };
        return point;
    },
    fromJson: function (coordinates) {
        var x = coordinates[0];
        var y = coordinates[1];
        return Point.create(x, y);
    },
    fromGeoJson: function (json) {
        var coordinates = json.coordinates;
        return Point.fromJson(coordinates);
    }
};

var Circle = {
    create: function (center, radius) {
        var circle = Markable();
        var backup = [];
        circle.getCenter = function () {
            return center;
        };
        circle.getRadius = function () {
            return radius;
        };
        circle.setRadius = function ($radius) {
            radius = $radius;
            return circle;
        };
        circle.scale = function (scaleX, scaleY) {
            center.scale(scaleX, scaleY);
            radius *= Math.max(scaleX, scaleY);
            return circle;
        };
        circle.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.scaleAndMark(scaleX, scaleY, mark);
                radius *= Math.max(scaleX, scaleY);
            }
            return circle;
        };
        circle.translate = function (deltaX, deltaY) {
            center.translate(deltaX, deltaY);
            return circle;
        };
        circle.translateAndMark = function (deltaX, deltaY, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.translateAndMark(deltaX, deltaY, mark);
            }
            return circle;
        };
        circle.transform = function (transformation) {
            transformation.transformPoint(center);
            radius = transformation.transformDistance(radius);
            return circle;
        };
        circle.transformAndMark = function (transformation, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.transformAndMark(transformation, mark);
                radius = transformation.transformDistance(radius);
            }
            return circle;
        };
        circle.backup = function () {
            center.backup();
            backup.push(radius);
            return circle;
        };
        circle.restore = function () {
            center.restore();
            radius = backup.pop();
            return circle;
        };
        circle.getType = function () {
            return Type.CIRCLE;
        };
        circle.toJson = function () {
            return [center.toJson(), radius];
        };
        circle.toGeoJson = function () {
            return {
                type: "Circle",
                coordinates: center.toJson(),
                radius: radius
            };
        };
        circle.copy = function () {
            return Circle.create(center.copy(), radius);
        };

        //
        circle.distanceTo = function (x, y, pixelsToCenter) {
            var centerX = center.getX();
            var centerY = center.getY();
            var deltaX = x - centerX;
            var deltaY = y - centerY;
            if (pixelsToCenter === undefined) {
                pixelsToCenter = euclidean(centerX, centerY, x, y);
            }
            var ratio = radius / pixelsToCenter;
            return distance(x, y,
                centerX + ratio * deltaX,
                centerY + ratio * deltaY,
                pixelsToCenter - radius);
        };
        circle.distanceToPoint = function (point) {
            var x = point.getX();
            var y = point.getY();
            return circle.distanceTo(x, y);
        };
        circle.distanceToGeometry = function (geometry) {
            var distance = geometry.distanceToPoint(center);
            return circle.distanceTo(
                distance.otherX(center.getX()),
                distance.otherY(center.getY()),
                distance.pixels);
        };
        circle.contains = function (x, y) {
            var pixelsToCenter = euclidean(center.getX(), center.getY(), x, y);
            return pixelsToCenter <= radius;
        };
        circle.containsPoint = function (point) {
            return circle.contains(point.getX(), point.getY());
        };
        circle.intersectsGeometry = function (geometry) {
            var distanceToCenter = geometry.distanceToPoint(center);
            return distanceToCenter.pixels <= radius;
        };
        circle.computeBoundingBox = function (box) {
            var diameter = 2 * radius;
            return box.setBox(
                center.getX() - radius,
                center.getY() - radius,
                diameter, diameter);
        };

        return circle;
    },
    fromJson: function (json) {
        var center = Point.fromJson(json[0]);
        var radius = json[1];
        return Circle.create(center, radius);
    },
    fromGeoJson: function (json) {
        var radius = json.radius;
        var center = Point.fromJson(json.coordinates);
        return Circle.create(center, radius);
    }
};

var Box = {
    create: function (topLeft, bottomRight) {
        var box = Markable();
        bottomRight = bottomRight || topLeft.copy();
        if (bottomRight == topLeft) bottomRight = bottomRight.copy();
        box.getLeft = topLeft.getX;
        box.getTop = topLeft.getY;
        box.getRight = bottomRight.getX;
        box.getBottom = bottomRight.getY;
        var assureTopLeftMin = function () {
            var x1 = topLeft.getX();
            var x2 = bottomRight.getX();
            var y1 = topLeft.getY();
            var y2 = bottomRight.getY();
            topLeft.setMin(x2, y2);
            bottomRight.setMax(x1, y1);
        };
        assureTopLeftMin();
        box.toString = function () {
            return '[ ' + topLeft.toString() + ' / ' + bottomRight.toString() + ' ]';
        };
        box.getTopLeft = function () {
            return topLeft;
        };
        box.getBottomRight = function () {
            return bottomRight;
        };
        box.getWidth = function () {
            return box.getRight() - box.getLeft();
        };
        box.getHeight = function () {
            return box.getBottom() - box.getTop();
        };
        box.set = function (_topLeft, _bottomRight) {
            topLeft.set(_topLeft.getX(), _topLeft.getY());
            bottomRight.set(_bottomRight.getX(), _bottomRight.getY());
            return box;
        };
        box.stretchToContain = function (point) {
            var x = point.getX();
            var y = point.getY();
            topLeft.setMin(x, y);
            bottomRight.setMax(x, y);
            return box;
        };
        box.setBox = function (left, top, width, height) {
            topLeft.set(left, top);
            bottomRight.set(left + width, top + height);
            return box;
        };
        box.translate = function (deltaX, deltaY) {
            topLeft.translate(deltaX, deltaY);
            bottomRight.translate(deltaX, deltaY);
            return box;
        };
        box.translateAndMark = function (deltaX, deltaY, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                topLeft.translateAndMark(deltaX, deltaY, mark);
                bottomRight.translateAndMark(deltaX, deltaY, mark);
            }
            return box;
        };
        box.scale = function (scaleX, scaleY) {
            topLeft.scale(scaleX, scaleY);
            bottomRight.scale(scaleX, scaleY);
            return box;
        };
        box.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                topLeft.scaleAndMark(scaleX, scaleY, mark);
                bottomRight.scaleAndMark(scaleX, scaleY, mark);
            }
            return box;
        };
        box.transform = function (transformation) {
            topLeft.transform(transformation);
            bottomRight.transform(transformation);
            assureTopLeftMin();
            return box;
        };
        box.transformAndMark = function (transformation, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                topLeft.transformAndMark(transformation, mark);
                bottomRight.transformAndMark(transformation, mark);
                assureTopLeftMin();
            }
            return box;
        };
        box.backup = function () {
            topLeft.backup();
            bottomRight.backup();
            return box;
        };
        box.restore = function () {
            topLeft.restore();
            bottomRight.restore();
            return box;
        };
        box.getType = function () {
            return Type.BOX;
        };
        box.toJson = function () {
            return [
                topLeft.toJson(),
                bottomRight.toJson()
            ];
        };
        box.toGeoJson = function () {
            return {
                type: "Envelope",
                coordinates: box.toJson()
            };
        };
        box.copy = function () {
            return Box.create(topLeft.copy(), bottomRight.copy());
        };

        //
        var getRow = function (y) {
            if (y < box.getTop()) {
                return 0;
            }
            if (y < box.getBottom()) {
                return 1;
            }
            return 2;
        };
        var getColumn = function (x) {
            if (x < box.getLeft()) {
                return 0;
            }
            if (x < box.getRight()) {
                return 1;
            }
            return 2;
        };
        box.getSector = function (x, y) {
            var column = getColumn(x);
            var row = getRow(y);
            return row * 3 + column;
        };
        box.getPointsSector = function (point) {
            return box.getSector(point.getX(), point.getY());
        };
        box.distanceTo = function (x, y) {
            var sector = box.getSector(x, y);
            switch (sector) {
                case 0:
                    return distance(x, y, box.getLeft(), box.getTop());
                case 1:
                    return distance(x, y, x, box.getTop(), box.getTop() - y);
                case 2:
                    return distance(x, y, box.getRight(), box.getTop());
                case 3:
                    return distance(x, y, box.getLeft(), y, box.getLeft() - x);
                case 4:
                    return innerDistance(x, y);
                case 5:
                    return distance(x, y, box.getRight(), y, x - box.getRight());
                case 6:
                    return distance(x, y, box.getLeft(), box.getBottom());
                case 7:
                    return distance(x, y, x, box.getBottom(), y - box.getBottom());
                case 8:
                    return distance(x, y, box.getRight(), box.getBottom());
            }
        };
        var innerDistance = function (x, y) {
            var left = box.getLeft();
            var top = box.getTop();
            var right = box.getRight();
            var bottom = box.getBottom();
            var centerX = left + (right - left) / 2;
            var centerY = top + (bottom - top) / 2;
            if (x < centerX) {
                if (y < centerY) {
                    return minDistance2(
                        distance(x, y, x, top),
                        distance(x, y, left, y)
                    );
                } else {
                    return minDistance2(
                        distance(x, y, x, bottom),
                        distance(x, y, left, y)
                    );
                }
            } else {
                if (y < centerY) {
                    return minDistance2(
                        distance(x, y, x, top),
                        distance(x, y, right, y)
                    );
                } else {
                    return minDistance2(
                        distance(x, y, x, bottom),
                        distance(x, y, right, y)
                    );
                }
            }
        };
        box.distanceToPoint = function (point) {
            return box.distanceTo(point.getX(), point.getY());
        };
        box.contains = function (x, y) {
            return box.getSector(x, y) == 4;
        };
        box.containsPoint = function (point) {
            return box.contains(point.getX(), point.getY());
        };
        box.intersectsBox = function (other) {
            return intersects(box.getLeft(), box.getRight(), other.getLeft(), other.getRight())
                && intersects(box.getTop(), box.getBottom(), other.getTop(), other.getBottom());
        };
        box.computeBoundingBox = function (bb) {
            return bb.set(topLeft, bottomRight);
        };

        return box;
    },
    empty: function () {
        var zero = Point.create(0, 0);
        return Box.create(zero.copy(), zero.copy());
    },
    fromJson: function (json) {
        var topLeft = Point.fromJson(json[0]);
        var bottomRight = Point.fromJson(json[1]);
        return Box.create(topLeft, bottomRight);
    },
    fromGeoJson: function (json) {
        return Box.fromJson(json.coordinates);
    }
};


var Line = {
    create: function (start, stop) {
        var line = Markable();
        line.getStart = function () {
            return start;
        };
        line.getStop = function () {
            return stop;
        };
        line.translate = function (deltaX, deltaY) {
            start.translate(deltaX, deltaY);
            stop.translate(deltaX, deltaY);
            return line;
        };
        line.translateAndMark = function (deltaX, deltaY, mark) {
            start.translateAndMark(deltaX, deltaY, mark);
            stop.translateAndMark(deltaX, deltaY, mark);
            return line;
        };
        line.scale = function (scaleX, scaleY) {
            start.scale(scaleX, scaleY);
            stop.scale(scaleX, scaleY);
            return line;
        };
        line.scaleAndMark = function (scaleX, scaleY, mark) {
            start.scaleAndMark(scaleX, scaleY, mark);
            stop.scaleAndMark(scaleX, scaleY, mark);
            return line;
        };
        line.transform = function (transformation) {
            start.transform(transformation);
            stop.transform(transformation);
            return line;
        };
        line.transformAndMark = function (transformation, mark) {
            start.transformAndMark(transformation, mark);
            stop.transformAndMark(transformation, mark);
            return line;
        };
        line.backup = function () {
            start.backup();
            stop.backup();
            return line;
        };
        line.restore = function () {
            start.restore();
            stop.restore();
            return line;
        };
        line.getType = function () {
            return Type.LINE;
        };
        line.toJson = function () {
            return [start.toJson(), stop.toJson()];
        };
        line.toGeoJson = function () {
            return {
                type: "MultiPoint",
                coordinates: line.toJson()
            };
        };
        line.copy = function () {
            return Line.create(
                start.copy(), stop.copy());
        };


        //
        line.distanceTo = function (x, y) {
            return distancePointLine(x, y,
                start.getX(), start.getY(), stop.getX(), stop.getY());
        };
        line.distanceToPoint = function (point) {
            return line.distanceTo(point.getX(), point.getY());
        };
        line.distanceToLine = function (other) {
            var otherStart = other.getStart();
            var otherStop = other.getStop();
            return distanceLineLine(
                start.getX(), start.getY(), stop.getX(), stop.getY(),
                otherStart.getX(), otherStart.getY(), otherStop.getX(), otherStop.getY());
        };
        line.distanceToBox = function (box) {
            var left = box.getLeft();
            var top = box.getTop();
            var right = box.getRight();
            var bottom = box.getBottom();
            var sX = start.getX();
            var sY = start.getY();
            var eX = stop.getX();
            var eY = stop.getY();
            return minDistance4(
                distanceLineLine(
                    sX, sY, eX, eY,
                    left, top, right, top),
                distanceLineLine(
                    sX, sY, eX, eY,
                    right, top, right, bottom),
                distanceLineLine(
                    sX, sY, eX, eY,
                    right, bottom, left, bottom),
                distanceLineLine(
                    sX, sY, eX, eY,
                    left, bottom, left, top));
        };
        line.intersects = function (x, y) {
            var sX = start.getX();
            var eX = stop.getX();
            if (!within(x, sX, eX)) {
                return false;
            }
            var sY = start.getY();
            var eY = stop.getY();
            if (!within(y, sY, eY)) {
                return false;
            }
            var deltaX = eX - sX;
            var deltaY = eY - sY;
            return (deltaX / deltaY) == (x - sX) / (y - sY);
        };
        line.intersectsPoint = function (point) {
            return line.intersects(point.getX(), point.getY());
        };
        line.intersectsLine = function (other) {
            var otherStart = other.getStart();
            var otherStop = other.getStop();
            return other.doesSeparate(start.getX(), start.getY(), stop.getX(), stop.getY())
                && line.doesSeparate(otherStart.getX(), otherStart.getY(), otherStop.getX(), otherStop.getY());
        };
        var intersectsHorizontalLine = function (y, from, to) {
            return within(y, start.getY(), stop.getY())
                && line.doesSeparate(from, y, to, y);
        };
        var intersectsVerticalLine = function (x, from, to) {
            return within(x, start.getX(), stop.getX())
                && line.doesSeparate(x, from, x, to);
        };
        line.doesSeparate = function (x1, y1, x2, y2) {
            var sX = start.getX();
            var sY = start.getY();
            var eX = stop.getX();
            var eY = stop.getY();
            var deltaX = sX - eX;
            var minusDeltaY = eY - sY;
            var crossProductA = (x1 - sX) * minusDeltaY + (y1 - sY) * deltaX;
            var crossProductB = (x2 - sX) * minusDeltaY + (y2 - sY) * deltaX;
            return (crossProductA < 0) != (crossProductB < 0);
        };
        line.intersectsBox = function (box) {
            var sectorStart = box.getPointsSector(start);
            var sectorStop = box.getPointsSector(stop);
            if (sectorStart == 4 || sectorStop == 4) {
                return true;
            }
            if (sectorStart == sectorStop) {
                return false;
            }
            var left = box.getLeft();
            var right = box.getRight();
            var top = box.getTop();
            var bottom = box.getBottom();
            return intersectsHorizontalLine(top, left, right)
                || intersectsHorizontalLine(bottom, left, right)
                || intersectsVerticalLine(left, top, bottom)
                || intersectsVerticalLine(right, top, bottom);
        };
        line.computeBoundingBox = function (box) {
            box.set(start, start);
            box.stretchToContain(stop);
            return box;
        };

        return line;
    },
    fromJson: function (json) {
        var start = Point.fromJson(json[0]);
        var stop = Point.fromJson(json[1]);
        return Line.create(start, stop);
    },
    fromGeoJson: function (json) {
        return Line.fromJson(json.coordinates);
    }
};

var Path = {
    create: function () {
        var path = Markable();
        var pointer = null;
        var lines = [];
        var currentMark = true;
        path.getLines = function () {
            return lines;
        };
        path.size = function () {
            return lines.length;
        };
        path.getStop = function () {
            var lineIndex = lines.length - 1;
            if (lineIndex >= 0) {
                return lines[lineIndex].getStop();
            }
        };
        path.get = function (index) {
            return lines[index];
        };
        path.getStart = function () {
            if (lines.length) {
                return lines[0].getStart();
            }
            return null;
        };
        path.moveTo = function (point) {
            if (lines.length > 0) throw "started path must not be moved no more";
            pointer = point;
            return path;
        };
        path.lineTo = function (point, useRaw) {
            if (pointer == null) {
                return path.moveTo(point);
            }
            point = useRaw ? point : (path.getEqualPoint(point) || point);
            if (pointer == point) {
                return path;
            }
            var line = Line.create(pointer, point);
            pointer = point;
            lines.push(line);
            return path;
        };
        path.close = function () {
            var start = path.getStart();
            return path.lineTo(start, true);
        };
        path.isClosed = function () {
            if (lines.length < 2) {
                return false;
            }
            var start = path.getStart();
            var stop = path.getStop();
            return start == stop;
        };
        path.getPointer = function () {
            return pointer;
        };
        path.scale = function (scaleX, scaleY) {
            currentMark = !currentMark;
            path.scaleAndMark(scaleX, scaleY, currentMark);
            return path;
        };
        path.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!path.isMarkedAs(mark) && lines.length) {
                path.markAs(mark);
                path.forEach(function (point) {
                    point.scaleAndMark(scaleX, scaleY, mark);
                });
            }
            return path;
        };
        path.translate = function (deltaX, deltaY) {
            currentMark = !currentMark;
            path.translateAndMark(deltaX, deltaY, currentMark);
            return path;
        };
        path.translateAndMark = function (deltaX, deltaY, mark) {
            if (!path.isMarkedAs(mark)) {
                path.markAs(mark);
                path.forEach(function (point) {
                    point.translateAndMark(deltaX, deltaY, mark);
                });
            }
            return path;
        };
        path.transform = function (transformation) {
            currentMark = !currentMark;
            return path.transformAndMark(transformation, currentMark);
        };
        path.transformAndMark = function (transformation, mark) {
            if (!path.isMarkedAs(mark)) {
                path.markAs(mark);
                path.forEach(function (point) {
                    point.transformAndMark(transformation, mark);
                });
            }
            return path;
        };
        path.backup = function () {
            for (var i = 0; i < lines.length; i++) {
                lines[i].backup();
            }
            if (pointer != null) {
                pointer.backup();
            }
            return path;
        };
        path.restore = function () {
            for (var i = 0; i < lines.length; i++) {
                lines[i].restore();
            }
            if (pointer != null) {
                pointer.restore();
            }
            return path;
        };
        path.getType = function () {
            return Type.PATH;
        };
        path.toJson = function () {
            var json = [];
            path.forEach(function (point) {
                json.push(point.toJson());
            }, false, true);
            return json;
        };
        path.toGeoJson = function () {
            return {
                type: "LineString",
                coordinates: path.toJson()
            };
        };
        path.copy = function () {
            var other = Path.create();
            if (lines.length > 0) {
                other.moveTo(path.getStart().copy());
                var closed = path.isClosed();
                var size = closed ? lines.length - 1 : lines.length;
                for (var i = 0; i < size; i++) {
                    var stop = lines[i].getStop();
                    other.lineTo(stop.copy());
                }
                if (closed) other.close();
            }
            return other;
        };

        //
        var minimumOverLines = function (distanceFunction) {
            var minimum = null;
            for (var i = 0; i < lines.length; i++) {
                var distance = distanceFunction(lines[i]);
                if (minimum == null) {
                    minimum = distance;
                } else {
                    minimum = minDistance2(
                        minimum, distance);
                }
            }
            return minimum;
        };
        path.distanceTo = function (x, y) {
            return minimumOverLines(
                function (line) {
                    return line.distanceTo(x, y);
                }
            );
        };
        path.distanceToPoint = function (point) {
            return path.distanceTo(point.getX(), point.getY());
        };
        path.distanceToBox = function (box) {
            return minimumOverLines(
                function (line) {
                    return line.distanceToBox(box);
                }
            );
        };
        path.distanceToLine = function (line) {
            return minimumOverLines(
                function (myLine) {
                    return myLine.distanceToLine(line);
                }
            );
        };
        path.distanceToPath = function (path) {
            return minimumOverLines(
                function (line) {
                    return path.distanceToLine(line);
                }
            );
        };
        path.contains = function (x, y) {
            return lines.some(
                function (line) {
                    return line.contains(x, y);
                }
            );
        };
        path.containsPoint = function (point) {
            return path.contains(point.getX(), point.getY());
        };
        path.intersectsBox = function (box) {
            return lines.some(function (line) {
                return line.intersectsBox(box);
            });
        };
        path.intersectsLine = function (line) {
            return lines.some(function (myLine) {
                return myLine.intersectsLine(line);
            });
        };
        path.intersectsPath = function (path) {
            return lines.some(function (line) {
                return path.intersectsLine(line);
            });
        };
        path.computeBoundingBox = function (box) {
            if (lines.length == 0) {
                throw 'empty path has no bounding box';
            }
            var start = path.getStart();
            box.set(start, start);
            for (var i = 0; i < lines.length; i++) {
                var stop = lines[i].getStop();
                box.stretchToContain(stop);
            }
            return box;
        };
        path.forEach = function (handler, reverse, excludePointer) {
            var numberOfLines = lines.length;
            if (!numberOfLines) return;
            var i;
            if (!excludePointer && pointer) handler(pointer);
            if (reverse) {
                handler(lines[numberOfLines - 1].getStop());
                for (i = numberOfLines - 1; i >= 0; i--) {
                    handler(lines[i].getStart());
                }
            } else {
                handler(lines[0].getStart());
                for (i = 0; i < numberOfLines; i++) {
                    handler(lines[i].getStop());
                }
            }
        };
        path.getEqualPoint = function (point) {
            if (pointer && pointer.equals(point)) return pointer;
            if (!lines.length) return;
            var start = lines[0].getStart();
            if (start.equals(point)) return start;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var stop = line.getStop();
                if (stop.equals(point)) return stop;
            }
        };

        return path;
    },
    fromJson: function (json) {
        var path = Path.create();
        if (json.length) {
            var first = Point.fromJson(json[0]);
            path.moveTo(first);
            for (var i = 1; i < json.length; i++) {
                var point = Point.fromJson(json[i]);
                path.lineTo(point);
            }
            if (path.getStart().equals(path.getStop())) path.close();
        }
        return path;
    },
    fromGeoJson: function (json) {
        return Path.fromJson(json.coordinates);
    }
};


var Polygon = {
    create: function () {
        var polygon = Markable();
        var paths = [];
        var currentMark = true;
        polygon.addPath = function (path) {
            if (!path.isClosed()) throw 'only closed paths can be added to a polygon!';
            paths.push(path);
            return polygon;
        };
        polygon.getPaths = function () {
            return paths;
        };
        polygon.scale = function (scaleX, scaleY) {
            currentMark = !currentMark;
            return polygon.scaleAndMark(scaleX, scaleY, currentMark);
        };
        polygon.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!polygon.isMarkedAs(mark)) {
                polygon.markAs(mark);
                for (var i = 0; i < paths.length; i++) {
                    paths[i].scaleAndMark(scaleX, scaleY, mark);
                }
            }
            return polygon;
        };
        polygon.translate = function (deltaX, deltaY) {
            currentMark = !currentMark;
            return polygon.translateAndMark(deltaX, deltaY, currentMark);
        };
        polygon.translateAndMark = function (deltaX, deltaY, mark) {
            if (!polygon.isMarkedAs(mark)) {
                polygon.markAs(mark);
                for (var i = 0; i < paths.length; i++) {
                    paths[i].translateAndMark(deltaX, deltaY, mark);
                }
            }
            return polygon;
        };
        polygon.transform = function (transformation) {
            currentMark = !currentMark;
            return polygon.transformAndMark(transformation, currentMark);
        };
        polygon.transformAndMark = function (transformation, mark) {
            if (!polygon.isMarkedAs(mark)) {
                polygon.markAs(mark);
                for (var i = 0; i < paths.length; i++) {
                    paths[i].transformAndMark(transformation, mark);
                }
            }
            return polygon;
        };
        polygon.backup = function () {
            for (var i = 0; i < paths.length; i++) {
                paths[i].backup();
            }
            return polygon;
        };
        polygon.restore = function () {
            for (var i = 0; i < paths.length; i++) {
                paths[i].restore();
            }
            return polygon;
        };
        polygon.getType = function () {
            return Type.POLYGON;
        };
        polygon.toJson = function () {
            var json = [];
            for (var i = 0; i < paths.length; i++) {
                json[i] = paths[i].toJson();
            }
            return json;
        };
        polygon.toGeoJson = function () {
            return {
                type: "Polygon",
                coordinates: polygon.toJson()
            };
        };
        polygon.copy = function () {
            var other = Polygon.create();
            for (var i = 0; i < paths.length; i++) {
                other.addPath(paths[i].copy());
            }
            return other;
        };

        //
        var minimumOverPaths = function (distanceFunction) {
            var minimum = null;
            for (var i = 0; i < paths.length; i++) {
                var distance = distanceFunction(paths[i]);
                if (minimum == null) {
                    minimum = distance;
                } else {
                    minimum = minDistance2(minimum, distance);
                }
            }
            return minimum;
        };
        polygon.existsPath = function (predicate) {
            return paths.some(predicate);
        };
        polygon.contains = function (x, y) {
            var contains = false;
            for (var i = 0; i < paths.length; i++) {
                var lines = paths[i].getLines();
                for (var j = 0; j < lines.length; j++) {
                    var line = lines[j];
                    if (rayCrossesLine(x, y, line)) {
                        contains = !contains;
                    }
                }
            }
            return contains;
        };
        //true, iff the vertical ray that starts at (rayX, rayY) crosses the given line
        var rayCrossesLine = function (rayX, rayY, line) {
            var start = line.getStart();
            var stop = line.getStop();
            var sX = start.getX();
            var eX = stop.getX();
            if ((sX < rayX) == (eX < rayX)) {
                return false;
            }
            var sY = start.getY();
            var eY = stop.getY();
            if (rayY < Math.min(sY, eY)) {
                return true;
            }
            var lineYPerX = (eY - sY) / (eX - sX);
            var lineYAtRayX = lineYPerX * (rayX - sX) + sY;
            return rayY < lineYAtRayX;
        };
        polygon.containsPoint = function (point) {
            return polygon.contains(point.getX(), point.getY());
        };
        polygon.intersectsBox = function (box) {
            return polygon.contains(box.getLeft(), box.getTop())
                || paths.some(function (path) {
                    return path.intersectsBox(box);
                })
        };
        polygon.intersectsLine = function (line) {
            return polygon.containsPoint(line.start)
                || paths.some(function (path) {
                    return path.intersectsLine(line);
                });
        };
        polygon.intersectsPath = function (path) {
            return polygon.containsPoint(path.getStart())
                || paths.some(function (myPath) {
                    return myPath.intersectsPath(path);
                });
        };
        polygon.intersectsPolygon = function (other) {
            return other.existsPath(function (path) {
                    return polygon.containsPoint(path.getStart());
                })
                || paths.some(function (path) {
                    return other.intersectsPath(path);
                });
        };
        polygon.distanceTo = function (x, y) {
            return minimumOverPaths(
                function (path) {
                    return path.distanceTo(x, y);
                });
        };
        polygon.distanceToPoint = function (point) {
            return polygon.distanceTo(point.getX(), point.getY());
        };
        polygon.distanceToBox = function (box) {
            return minimumOverPaths(
                function (path) {
                    return path.distanceToBox(box);
                });
        };
        polygon.distanceToLine = function (line) {
            return minimumOverPaths(
                function (path) {
                    return path.distanceToLine(line);
                });
        };
        polygon.distanceToPath = function (path) {
            return minimumOverPaths(
                function (myPath) {
                    return myPath.distanceToPath(path);
                });
        };
        polygon.distanceToPolygon = function (other) {
            return minimumOverPaths(
                function (path) {
                    return other.distanceToPath(path);
                });
        };
        polygon.computeBoundingBox = function (box) {
            if (paths.length == 0) {
                throw 'empty polygon has no bounding box';
            }
            var firstPoint = paths[0].getLines()[0].getStart();
            box.set(firstPoint, firstPoint);
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var lines = path.getLines();
                var start = lines[0].getStart();
                box.stretchToContain(start);
                for (var j = 0; j < lines.length; j++) {
                    var stop = lines[j].getStop();
                    box.stretchToContain(stop);
                }
            }
            return box;
        };

        return polygon;
    },
    fromJson: function (json) {
        var polygon = Polygon.create();
        for (var i = 0; i < json.length; i++) {
            var path = Path.fromJson(json[i]);
            polygon.addPath(path.close());
        }
        return polygon;
    },
    fromGeoJson: function (json) {
        return Polygon.fromJson(json.coordinates);
    }
};


var distance = function (ax, ay, bx, by, pixels) {
    if (pixels === undefined) pixels = euclidean(ax, ay, bx, by);
    var a = {x: ax, y: ay};
    var b = {x: bx, y: by};
    return {
        pixels: pixels,
        a: a,
        b: b,
        otherX: function (x) {
            return (x == ax) ? bx : ax;
        },
        otherY: function (y) {
            return (y == ay) ? by : ay;
        },
        other: function (point) {
            return (point.x == ax && point.y == ay) ? b : a;
        }
    };
};

var minDistance2 = function (a, b) {
    return (b.pixels < a.pixels) ? b : a;
};

var minDistance4 = function (a, b, c, d) {
    return minDistance2(
        minDistance2(a, b),
        minDistance2(c, d)
    );
};

module.exports = {
    Type: Type,
    Point: Point,
    Box: Box,
    Circle: Circle,
    Line: Line,
    Path: Path,
    Polygon: Polygon
};
