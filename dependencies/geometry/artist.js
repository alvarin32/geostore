var Geo = require('./geometry');

var dummy = function () {
};

var cmToPx = cmToPx || function (cms) {
        return Math.round(cms * 50);
    };

module.exports = function (context, options) {
    options = options || {};
    var TWO_PI = 2 * Math.PI;
    var STROKE_STRONG = Math.round(cmToPx(options.strong || 20) / 100);
    var STROKE_LIGHT = Math.round(cmToPx(options.light || 5) / 100);
    var DOT_SIZE = Math.round(cmToPx(options.dotSize || 20) / 100);
    var DARK = options.dark || '#303030';
    var BRIGHT = options.bright || '#f3f3f3';
    var ALPHA = options.alpha || 0.6;

    (function () {
        context.lineJoin = 'round';
        context.mozFillRule = 'evenodd';
        context.setLineDash = context.setLineDash || dummy;
        context.getLineDash = context.getLineDash || dummy;
        context.font = '12pt Calibri';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
    })();

    var renderPoint = function (point) {
        renderXY(point.getX(), point.getY());
    };

    var renderXY = function (x, y) {
        var fillBackup = context.fillStyle;
        context.beginPath();
        context.arc(x, y, DOT_SIZE, 0, TWO_PI, false);
        context.fillStyle = BRIGHT;
        context.fill();
        context.lineWidth = STROKE_LIGHT;
        context.strokeStyle = DARK;
        context.stroke();
        context.beginPath();
        context.arc(x, y, DOT_SIZE * 0.5, 0, TWO_PI, false);
        context.fillStyle = DARK;
        context.fill();
        context.fillStyle = fillBackup;
    };

    var renderCircle = function (circle) {
        var center = circle.getCenter();
        var radius = circle.getRadius();
        context.beginPath();
        context.arc(center.getX(), center.getY(), radius, 0, TWO_PI, false);
        fillWithAlpha(ALPHA, DARK);
        context.lineWidth = STROKE_STRONG;
        context.strokeStyle = DARK;
        context.stroke();
        renderPoint(center);
    };

    var renderBox = function (box, showNodes) {
        context.beginPath();
        context.rect(box.getLeft(), box.getTop(), box.getWidth(), box.getHeight());
        fillWithAlpha(ALPHA, DARK);
        context.lineWidth = STROKE_STRONG;
        context.strokeStyle = DARK;
        context.stroke();
        if (showNodes) renderXY(box.getLeft(), box.getTop());
    };

    var renderLine = function (line) {
        var start = line.getStart();
        var end = line.getStop();
        context.beginPath();
        context.moveTo(start.getX(), start.getY());
        context.lineTo(end.getX(), end.getY());
        context.lineWidth = STROKE_STRONG;
        context.strokeStyle = DARK;
        context.stroke();
        renderPoint(start);
        renderPoint(end);
    };

    var renderPath = function (path, showNodes, fill) {
        var closed = path.isClosed();
        var lines = path.getLines();
        if (lines.length == 0) return;
        var first = lines[0].getStart();
        context.beginPath();
        context.moveTo(first.getX(), first.getY());
        var i, end;
        for (i = 0; i < lines.length; i++) {
            end = lines[i].getStop();
            context.lineTo(end.getX(), end.getY());
        }
        if (closed && !showNodes) {
            var second = lines[0].getStop();
            context.lineTo(second.getX(), second.getY());
        }
        if (fill) fillWithAlpha(ALPHA, DARK);
        context.lineWidth = STROKE_STRONG;
        context.strokeStyle = DARK;
        context.stroke();
        if (!closed) renderPoint(first);
        if (showNodes) {
            for (i = 0; i < lines.length; i++) {
                end = lines[i].getStop();
                renderPoint(end);
            }
        } else if (!closed) {
            var last = lines[lines.length - 1].getStop();
            renderPoint(last);
        }
    };

    var renderPolygon = function (polygon, showNodes) {
        var paths = polygon.getPaths();
        for (var i = 0; i < paths.length; i++) {
            renderPath(paths[i], showNodes, true);
        }
    };

    var fillWithAlpha = function (alpha, color) {
        if (alpha >= 1) {
            context.fillStyle = color;
            context.fill('evenodd');
        } else {
            var backup = context.globalAlpha;
            context.globalAlpha = backup * alpha;
            context.fillStyle = color;
            context.fill('evenodd');
            context.globalAlpha = backup;
        }
    };

    return {
        fillWithAlpha: fillWithAlpha,
        setColor: function (color, bright) {
            if (bright) return (BRIGHT = color);
            DARK = color;
        },
        setAlpha: function (alpha) {
            ALPHA = alpha;
        },
        draw: function (geo, showNodes) {
            switch (geo.getType()) {
                case Geo.Type.POINT:
                    renderPoint(geo);
                    break;
                case Geo.Type.CIRCLE:
                    renderCircle(geo, showNodes);
                    break;
                case Geo.Type.BOX:
                    renderBox(geo, showNodes);
                    break;
                case Geo.Type.LINE:
                    renderLine(geo);
                    break;
                case Geo.Type.PATH:
                    renderPath(geo, showNodes);
                    break;
                case Geo.Type.POLYGON:
                    renderPolygon(geo, showNodes);
                    break;
            }
        }
    };
};


