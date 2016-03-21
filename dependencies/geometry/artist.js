var Geo = require('./geometry');

var dummy = function () {
};

var cmToPx = cmToPx || function (cms) {
        return Math.round(cms * 50);
    };

module.exports = function (context) {

    var TWO_PI = 2 * Math.PI;

    var defaultStyle = {
        dotSize: Math.round(cmToPx(20) / 100),
        strokeWidth: Math.round(cmToPx(10) / 100),
        strokeColor: colors.dark,
        fillColor: colors.bright,
        fillAlpha: 0.6,
        hideNodes: false,
        hideStroke: false,
        labelFillColor: colors.bright,
        labelColor: colors.dark
    };

    (function () {
        context.lineJoin = 'round';
        context.mozFillRule = 'evenodd';
        context.setLineDash = context.setLineDash || dummy;
        context.getLineDash = context.getLineDash || dummy;
        context.font = '12pt Calibri';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
    })();

    var getStyle = function (element, style) {
        return style || element.style || (element.origin && element.origin.style) || defaultStyle;
    };

    var renderPoint = function (point, style) {
        style = getStyle(point, style);
        var dotSize = style.dotSize || defaultStyle.dotSize;
        var strokeWidth = style.strokeWidth || defaultStyle.strokeWidth;
        var strokeColor = style.strokeColor || defaultStyle.strokeColor;
        var fillColor = style.fillColor || defaultStyle.fillColor;

        var x = point.getX();
        var y = point.getY();
        context.beginPath();
        context.arc(x, y, dotSize, 0, TWO_PI, false);
        context.fillStyle = strokeColor;
        context.fill();
        context.beginPath();
        context.arc(x, y, dotSize - strokeWidth, 0, TWO_PI, false);
        context.fillStyle = fillColor;
        context.fill();

        var label = point.label || (point.origin && point.origin.label);
        if (label) renderLabel(label, x, y - dotSize, style);
    };

    var renderCircle = function (circle, style) {
        style = getStyle(circle, style);
        var dotSize = style.dotSize || defaultStyle.dotSize;
        var hideNodes = style.hideNodes || defaultStyle.hideNodes;

        var center = circle.getCenter();
        var radius = circle.getRadius();
        context.beginPath();
        context.arc(center.getX(), center.getY(), radius, 0, TWO_PI, false);
        fill(style);
        stroke(style);
        if (!hideNodes) renderPoint(center, center.style || style);
    };

    var renderBox = function (box, style) {
        style = getStyle(box, style);
        var hideNodes = style.hideNodes || defaultStyle.hideNodes;

        context.beginPath();
        context.rect(box.getLeft(), box.getTop(), box.getWidth(), box.getHeight());
        fill(style);
        stroke(style);
        if (!hideNodes) {
            renderPoint(box.getStart(), style);
            renderPoint(box.getStop(), style)
        }
    };

    var renderLine = function (line, style) {
        style = getStyle(line, style);
        var hideNodes = style.hideNodes || defaultStyle.hideNodes;

        var start = line.getStart();
        var stop = line.getStop();
        context.beginPath();
        context.moveTo(start.getX(), start.getY());
        context.lineTo(stop.getX(), stop.getY());
        stroke(style);
        if (!hideNodes) {
            renderPoint(start, start.style || style);
            renderPoint(stop, stop.style || style);
        }
    };

    var pathToCtx = function (path) {
        var closed = path.isClosed();
        var lines = path.getLines();
        if (lines.length == 0) return;
        var first = lines[0].getStart();
        context.moveTo(first.getX(), first.getY());
        var i, end, steps = closed ? lines.length - 1 : lines.length;
        for (i = 0; i < steps; i++) {
            end = lines[i].getStop();
            context.lineTo(end.getX(), end.getY());
        }
        if (closed) context.closePath();
    };

    var renderPath = function (path, style) {
        style = getStyle(path, style);
        var hideNodes = style.hideNodes || defaultStyle.hideNodes;

        context.beginPath();
        pathToCtx(path);
        stroke(style);
        if (!hideNodes) path.forEach(renderPoint);
    };

    var renderPolygon = function (polygon, style) {
        style = getStyle(polygon, style);
        var hideNodes = style.hideNodes || defaultStyle.hideNodes;

        context.beginPath();
        var i, paths = polygon.getPaths();
        paths.forEach(pathToCtx);

        fill(style);
        stroke(style);
        if (!hideNodes) {
            for (i = 0; i < paths.length; i++) {
                paths[i].forEach(renderPoint);
            }
        }
    };

    var stroke = function (style, color, width) {
        if (style.hideStroke) return;
        width = width || style.strokeWidth || defaultStyle.strokeWidth;
        color = color || style.strokeColor || defaultStyle.strokeColor;

        context.lineWidth = width;
        context.strokeStyle = color;

        if (style.lineDash) {
            var lineDash = context.getLineDash();
            context.setLineDash(style.lineDash);
            context.stroke();
            context.setLineDash(lineDash);
        } else {
            context.stroke();
        }
    };

    var fill = function (style, color, alpha) {
        if (style.hideFill) return;
        color = color || style.fillColor || defaultStyle.fillColor;
        alpha = alpha || style.fillAlpha || defaultStyle.fillAlpha;

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

    var renderLabel = function (text, x, y, style) {
        var strokeWidth = style.strokeWidth || defaultStyle.strokeWidth;
        var labelFillColor = style.labelFillColor || defaultStyle.labelFillColor;
        var labelColor = style.labelColor || defaultStyle.labelColor;

        var offset = strokeWidth;
        var width = context.measureText(text).width + 2 * offset;
        var height = 20;
        roundedRect(x, y - height - offset, width, height, offset, context);
        context.fillStyle = labelFillColor;
        context.fill();
        context.lineWidth = strokeWidth * 0.5;
        context.strokeStyle = labelColor;
        context.stroke();
        context.fillStyle = labelColor;
        context.fillText(text, x + width / 2, y - height / 2 - offset);
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
    };

    return {
        draw: function (geo, style) {
            switch (geo.getType()) {
                case Geo.Type.POINT:
                    renderPoint(geo, style);
                    break;
                case Geo.Type.CIRCLE:
                    renderCircle(geo, style);
                    break;
                case Geo.Type.BOX:
                    renderBox(geo, style);
                    break;
                case Geo.Type.LINE:
                    renderLine(geo, style);
                    break;
                case Geo.Type.PATH:
                    renderPath(geo, style);
                    break;
                case Geo.Type.POLYGON:
                    renderPolygon(geo, style);
                    break;
            }
        }
    };
};


