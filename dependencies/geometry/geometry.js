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
            if (backup.length) {
                y = backup.pop();
                x = backup.pop();
            }
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
            transformation(point);
            return point;
        };
        point.transformAndMark = function (transformation, mark) {
            if (!point.isMarkedAs(mark)) {
                point.markAs(mark);
                transformation(point);
            }
            return point;
        };
        point.getType = function () {
            return Type.POINT;
        };
        point.asArray = function () {
            return [x, y];
        };
        point.toGeoJson = function () {
            return {
                type: "Point",
                coordinates: [x, y]
            };
        };
        point.copy = function () {
            return Point.create(x, y);
        };
        point.toString = function () {
            return '(' + x + '/' + y + ')';
        };

        //
        point.contains = function ($x, $y) {
            return x == $x && y == $y;
        };
        point.containsPoint = function (other) {
            return point.contains(other.getX(), other.getY());
        };
        point.distanceTo = function (otherX, otherY) {
            return distance(x, y, otherX, otherY);
        };
        point.distanceToPoint = function (other) {
            return distance(x, y, other.getX(), other.getY());
        };
        point.computeBoundingBox = function (box) {
            box = box || Box.empty();
            return box.set(point, point);
        };
        return point;
    },
    fromArray: function (array) {
        var x = array[0];
        var y = array[1];
        return Point.create(x, y);
    },
    fromGeoJson: function (json) {
        var coordinates = json.coordinates;
        return Point.fromArray(coordinates);
    }
};

var Circle = {
    create: function (center, satellite) {
        var circle = Markable();
        var radius;

        var updateRadius = function () {
            var deltaX = center.getX() - satellite.getX();
            var deltaY = center.getY() - satellite.getY();
            radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            return circle;
        }
        updateRadius();

        circle.getCenter = function () {
            return center;
        };
        circle.getSatellite = function () {
            return satellite;
        };
        circle.getRadius = function () {
            return radius;
        };
        circle.scale = function (scaleX, scaleY) {
            center.scale(scaleX, scaleY);
            satellite.scale(scaleX, scaleY);
            return updateRadius();
        };
        circle.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.scaleAndMark(scaleX, scaleY, mark);
                satellite.scaleAndMark(scaleX, scaleY, mark);
                updateRadius();
            }
            return circle;
        };
        circle.translate = function (deltaX, deltaY) {
            center.translate(deltaX, deltaY);
            satellite.translate(deltaX, deltaY);
            return circle;
        };
        circle.translateAndMark = function (deltaX, deltaY, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.translateAndMark(deltaX, deltaY, mark);
                satellite.translateAndMark(deltaX, deltaY, mark);
            }
            return circle;
        };
        circle.transform = function (transformation) {
            transformation(center);
            transformation(satellite);
            return updateRadius();
        };
        circle.transformAndMark = function (transformation, mark) {
            if (!circle.isMarkedAs(mark)) {
                circle.markAs(mark);
                center.transformAndMark(transformation, mark);
                satellite.transformAndMark(transformation, mark);
                updateRadius();
            }
            return circle;
        };
        circle.backup = function () {
            center.backup();
            satellite.backup();
            return circle;
        };
        circle.restore = function () {
            center.restore();
            satellite.restore();
            return updateRadius();
        };
        circle.getType = function () {
            return Type.CIRCLE;
        };
        circle.toGeoJson = function () {
            var radiusInMeter = distanceInMeter(
                center.getY(), center.getX(), satellite.getY(), satellite.getX());
            return {
                type: "Circle",
                coordinates: center.asArray(),
                radius: radiusInMeter
            };
        };
        circle.copy = function () {
            return Circle.create(center.copy(), satellite.copy());
        };

        //
        circle.distanceTo = function (x, y, distanceToCenter) {
            var centerX = center.getX();
            var centerY = center.getY();
            var deltaX = x - centerX;
            var deltaY = y - centerY;
            if (distanceToCenter === undefined) {
                distanceToCenter = euclidean(centerX, centerY, x, y);
            }
            var ratio = radius / distanceToCenter;
            return distance(x, y,
                centerX + ratio * deltaX,
                centerY + ratio * deltaY,
                distanceToCenter - radius);
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
            var distanceToCenter = euclidean(center.getX(), center.getY(), x, y);
            return distanceToCenter <= radius;
        };
        circle.containsPoint = function (point) {
            return circle.contains(point.getX(), point.getY());
        };
        circle.intersectsGeometry = function (geometry) {
            var distanceToCenter = geometry.distanceToPoint(center);
            return distanceToCenter.pixels <= radius;
        };
        circle.computeBoundingBox = function (box) {
            box = box || Box.empty();
            var diameter = 2 * radius;
            return box.setBox(
                center.getX() - radius,
                center.getY() - radius,
                diameter, diameter);
        };

        return circle;
    },
    fromGeoJson: function (json) {
        var radius = json.radius;
        var center = Point.fromArray(json.coordinates);
        var satellite = shiftLocationEastByMeters(center.copy(), radius);
        return Circle.create(center, satellite);
    }
};

var Box = {
    create: function (start, stop) {
        var box = Markable();
        stop = stop || start.copy();
        if (stop == start) throw 'a box must not be spanned between a single point.';

        box.getLeft = function () {
            return Math.min(start.getX(), stop.getX());
        };
        box.getTop = function () {
            return Math.min(start.getY(), stop.getY());
        };
        box.getRight = function () {
            return Math.max(start.getX(), stop.getX());
        };
        box.getBottom = function () {
            return Math.max(start.getY(), stop.getY());
        };

        box.toString = function () {
            return '[ ' + start.toString() + ' / ' + stop.toString() + ' ]';
        };
        box.getStart = function () {
            return start;
        };
        box.getStop = function () {
            return stop;
        };
        box.getWidth = function () {
            return Math.abs(start.getX() - stop.getX());
        };
        box.getHeight = function () {
            return Math.abs(start.getY() - stop.getY());
        };
        box.set = function ($start, $stop) {
            start.set($start.getX(), $start.getY());
            stop.set($stop.getX(), $stop.getY());
            return box;
        };
        box.stretchToContain = function (point) {
            var x = point.getX();
            var y = point.getY();
            var startX = start.getX();
            var startY = start.getY();
            var stopX = stop.getX();
            var stopY = stop.getY();
            var left = Math.min(x, Math.min(startX, stopX));
            var right = Math.max(x, Math.max(startX, stopX));
            var top = Math.min(y, Math.min(startY, stopY));
            var bottom = Math.max(y, Math.max(startY, stopY));
            start.set(left, top);
            stop.set(right, bottom);
            return box;
        };
        box.setBox = function (left, top, width, height) {
            start.set(left, top);
            stop.set(left + width, top + height);
            return box;
        };
        box.translate = function (deltaX, deltaY) {
            start.translate(deltaX, deltaY);
            stop.translate(deltaX, deltaY);
            return box;
        };
        box.translateAndMark = function (deltaX, deltaY, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                start.translateAndMark(deltaX, deltaY, mark);
                stop.translateAndMark(deltaX, deltaY, mark);
            }
            return box;
        };
        box.scale = function (scaleX, scaleY) {
            start.scale(scaleX, scaleY);
            stop.scale(scaleX, scaleY);
            return box;
        };
        box.scaleAndMark = function (scaleX, scaleY, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                start.scaleAndMark(scaleX, scaleY, mark);
                stop.scaleAndMark(scaleX, scaleY, mark);
            }
            return box;
        };
        box.transform = function (transformation) {
            start.transform(transformation);
            stop.transform(transformation);
            return box;
        };
        box.transformAndMark = function (transformation, mark) {
            if (!box.isMarkedAs(mark)) {
                box.markAs(mark);
                start.transformAndMark(transformation, mark);
                stop.transformAndMark(transformation, mark);
            }
            return box;
        };
        box.backup = function () {
            start.backup();
            stop.backup();
            return box;
        };
        box.restore = function () {
            start.restore();
            stop.restore();
            return box;
        };
        box.getType = function () {
            return Type.BOX;
        };
        box.toGeoJson = function () {
            var topLeft = [box.getLeft(), box.getTop()];
            var bottomRight = [box.getRight(), box.getBottom()];
            return {
                type: "Envelope",
                coordinates: [topLeft, bottomRight]
            };
        };
        box.copy = function () {
            return Box.create(start.copy(), stop.copy());
        };

        //
        var getRow = function (y, top, bottom) {
            if (y < top) {
                return 0;
            }
            if (y < bottom) {
                return 1;
            }
            return 2;
        };
        var getColumn = function (x, left, right) {
            if (x < left) {
                return 0;
            }
            if (x < right) {
                return 1;
            }
            return 2;
        };
        box.getSector = function (x, y, left, top, bottom, right) {
            var column = getColumn(x, left, right);
            var row = getRow(y, top, bottom);
            return row * 3 + column;
        };
        box.getPointsSector = function (point) {
            var left = box.getLeft();
            var top = box.getTop();
            var bottom = box.getBottom();
            var right = box.getRight();
            return box.getSector(point.getX(), point.getY(), left, top, bottom, right);
        };
        box.distanceTo = function (x, y) {
            var top = box.getTop();
            var left = box.getLeft();
            var bottom = box.getBottom();
            var right = box.getRight();
            var sector = box.getSector(x, y, left, top, bottom, right);
            switch (sector) {
                case 0:
                    return distance(x, y, left, top);
                case 1:
                    return distance(x, y, x, top, top - y);
                case 2:
                    return distance(x, y, right, top);
                case 3:
                    return distance(x, y, left, y, left - x);
                case 4:
                    return innerDistance(x, y);
                case 5:
                    return distance(x, y, right, y, x - right);
                case 6:
                    return distance(x, y, left, bottom);
                case 7:
                    return distance(x, y, x, bottom, y - bottom);
                case 8:
                    return distance(x, y, right, bottom);
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
            var left = box.getLeft();
            var top = box.getTop();
            var right = box.getRight();
            var bottom = box.getBottom();
            return box.getSector(x, y, left, top, bottom, right) == 4;
        };
        box.containsPoint = function (point) {
            return box.contains(point.getX(), point.getY());
        };
        box.intersectsBox = function (other) {
            return intersects(box.getLeft(), box.getRight(), other.getLeft(), other.getRight())
                && intersects(box.getTop(), box.getBottom(), other.getTop(), other.getBottom());
        };
        box.computeBoundingBox = function (bb) {
            bb = bb || Box.empty();
            return bb.set(start, stop);
        };

        return box;
    },
    empty: function () {
        var zero = Point.create(0, 0);
        return Box.create(zero.copy(), zero.copy());
    },
    fromGeoJson: function (json) {
        var array = json.coordinates;
        var topLeft = Point.fromArray(array[0]);
        var bottomRight = Point.fromArray(array[1]);
        return Box.create(topLeft, bottomRight);
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
        line.toGeoJson = function () {
            return {
                type: "MultiPoint",
                coordinates: [start.asArray(), stop.asArray()]
            };
        };
        line.copy = function () {
            return Line.create(
                start.copy(), stop.copy());
        };


        //
        line.contains = function (x, y) {
            if (start.contains(x, y)) return true;
            if (stop.contains(x, y)) return true;
            var startX = start.getX();
            var stopX = stop.getX();
            if (!within(x, start.getX(), stop.getX())) return false;
            var startY = start.getY();
            var stopY = stop.getY();
            return (y - startY) / (x - startX) == (stopY - startY) / (stopX - startX);
        };
        line.containsPoint = function (point) {
            return line.contains(point.getX(), point.getY());
        };
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
            box = box || Box.empty();
            box.set(start, start);
            box.stretchToContain(stop);
            return box;
        };

        return line;
    },
    fromArray: function (array) {
        var start = Point.fromArray(array[0]);
        var stop = Point.fromArray(array[1]);
        return Line.create(start, stop);
    },
    fromGeoJson: function (json) {
        return Line.fromArray(json.coordinates);
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
            return lines.length && lines[0].getStart();
        };
        path.moveTo = function (point) {
            if (lines.length > 0) throw "started path must not be moved no more";
            pointer = point;
            return path;
        };
        path.lineTo = function (point) {
            if (pointer == null) {
                return path.moveTo(point);
            }
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
            return path.lineTo(start);
        };
        path.isClosed = function () {
            return path.getStart() == path.getStop();
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
            if (!path.isMarkedAs(mark)) {
                path.markAs(mark);
                path.forEach(function (point) {
                    point.scaleAndMark(scaleX, scaleY, mark);
                }, true);
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
                }, true);
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
                }, true);
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
        path.asArray = function () {
            var json = [];
            path.forEach(function (point) {
                json.push(point.asArray());
            });
            return json;
        };
        path.toGeoJson = function () {
            return {
                type: "LineString",
                coordinates: path.asArray()
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
            box = box || Box.empty();
            if (lines.length == 0) throw 'empty path has no bounding box';
            var start = path.getStart();
            box.set(start, start);
            for (var i = 0; i < lines.length; i++) {
                var stop = lines[i].getStop();
                box.stretchToContain(stop);
            }
            return box;
        };
        path.forEach = function (handler, includePointer) {
            var numberOfLines = lines.length;
            if (!numberOfLines) return;
            handler(lines[0].getStart());
            for (var i = 0; i < numberOfLines; i++) {
                handler(lines[i].getStop());
            }
            if (includePointer) handler(pointer);
        };

        return path;
    },
    fromArray: function (array) {
        var path = Path.create();
        if (array.length < 2) throw 'invalid path!';
        for (var i = 0; i < array.length - 1; i++) {
            var point = Point.fromArray(array[i]);
            path.lineTo(point);
        }
        var lastOne = Point.fromArray(array[i]);
        if (array.length > 2 && path.getStart().equals(lastOne)) path.close();
        else path.lineTo(lastOne);
        return path;
    },
    fromGeoJson: function (json) {
        return Path.fromArray(json.coordinates);
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
        polygon.asArray = function () {
            var array = [];
            for (var i = 0; i < paths.length; i++) {
                array[i] = paths[i].asArray();
            }
            return array;
        };
        polygon.toGeoJson = function () {
            return {
                type: "Polygon",
                coordinates: polygon.asArray()
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
            box = box || Box.empty();
            if (paths.length == 0) throw 'empty polygon has no bounding box';
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
    fromArray: function (array) {
        var polygon = Polygon.create();
        for (var i = 0; i < array.length; i++) {
            var path = Path.fromArray(array[i]);
            polygon.addPath(path.close());
        }
        return polygon;
    },
    fromGeoJson: function (json) {
        return Polygon.fromArray(json.coordinates);
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


var RADIANS_PER_DEGREE = Math.PI / 180;
var EARTH_RADIUS = 6378137; //meters
var CIRCUMFERENCE_AT_EQUATOR = 2 * Math.PI * EARTH_RADIUS;

var meterPerDegree = function (referenceDegree) {
    var referenceRadians = referenceDegree * RADIANS_PER_DEGREE;
    var circumferenceAtReference = Math.cos(referenceRadians) * CIRCUMFERENCE_AT_EQUATOR;
    return circumferenceAtReference / 360;
};

var degreesPerMeter = function (referenceDegree) {
    var referenceRadians = referenceDegree * RADIANS_PER_DEGREE;
    var circumferenceAtReference = Math.cos(referenceRadians) * CIRCUMFERENCE_AT_EQUATOR;
    return 360 / circumferenceAtReference;
};

var distanceInMeter = function (latA, lonA, latB, lonB) {
    var referenceLat = (latA + latB) / 2;
    var referenceLon = (lonA + lonB) / 2;
    var deltaLat = meterPerDegree(referenceLon) * (latA - latB);
    var deltaLon = meterPerDegree(referenceLat) * (lonA - lonB);
    return Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
}

var shiftLocationEastByMeters = function (location, meters) {
    var delta = degreesPerMeter(location.getY()) * meters;
    return location.translate(delta, 0);
};