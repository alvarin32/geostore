var Tiles = require('map/tiles');
var Colors = require('commons/colors');
var F = require('./fiat');
var Touches = require('./touches');
var Animator = require('./animation');

exports.createIcon = function (src, options) {
    options = options || {};
    var imageSize = options['imageSize'] || '60%';
    var circleSize = options['circleSize'] || '80%';
    var color = options.color || Colors.bright;

    var container = F.node('div').style({
        position: 'relative',
        cursor: 'pointer',
        width: '100%', height: '100%',
        display: 'inline-block'
    });

    var circle = F.node('div')
        .style(center)
        .style({
            height: circleSize, width: circleSize,
            borderRadius: '50%',
            backgroundColor: color
        });

    var image = F.node('img')
        .attr('src', src)
        .style(center)
        .style({width: imageSize, height: imageSize});

    container.setColor = function ($color) {
        color = $color;
        circle.style('backgroundColor', color);
        return container;
    };

    container.setSource = function (src) {
        image.attr('src', src);
        return container;
    };

    return container.append(circle, image);
};

exports.createGeoIcon = function (options) {

    options = options || {};
    var size = options.size || 2;
    options.offset = options.offset || size * 0.3;

    var container = F.node('div').style({
        borderRadius: '50%',
        overflow: 'hidden',
        width: cm(size, true),
        height: cm(size, true)
    });

    var image = Tiles.image(options).style({
        width: '100%', height: '100%',
        opacity: 0.6
    }).appendTo(container);

    container.update = function (geo, hide) {
        options.hideGeo = (geo == undefined) || hide;
        image.style('opacity', geo ? 1 : 0.6);
        container.style('border', geo ? 'none' : cm(size * 0.03) + ' dashed ' + colors.dark);
        image.setGeo(geo);
        return container;
    };


    return container;
};


exports.createProgressBar = function (size, color) {

    size = size || 1;
    color = color || colors.signal;

    var container = F.node('div').style({
        width: cm(size * 5), height: cm(size), display: 'inline-block',
        position: 'relative', border: colors.dark + ' solid ' + cm(size * 0.02)
    });

    var fill = F.node('div')
        .style({position: 'absolute', left: 0, top: 0, height: '100%', width: 0})
        .style({backgroundColor: colors.signal})
        .appendTo(container);

    var label = F.node('div')
        .style(center)
        .style({width: cm(2), height: cm(size * 0.3), lineHeight: cm(size * 0.3), fontSize: cm(size * 0.3)})
        .text('0%')
        .appendTo(container);

    var percent, isUpdating;
    var updateFill = function () {
        if (isUpdating) return;
        isUpdating = true;
        var $percent = percent;
        fill.animate({width: $percent}, {
            onDone: function () {
                isUpdating = false;
                if ($percent != percent) updateFill();
            }
        });
    };

    container.onProgress = function (progress) {
        percent = Math.round(progress * 100) + '%';
        label.text(percent);
        updateFill();
    };

    return container;
};


exports.createSwitchButton = function (state, radius) {
    radius = radius || '10%';
    var listeners = [];
    var container = F.node('div').style({
        position: 'relative',
        borderRadius: radius,
        backgroundColor: colors.dark,
        cursor: 'pointer'
    });

    var getLeft = function () {
        if (state) return '50%';
        return '0%'
    };

    var getColor = function () {
        if (state) return '#0CE86F';
        return '#FF360D';
    };

    var theSwitch = F.node('div').style({
        position: 'absolute',
        left: getLeft(),
        width: '50%', height: '100%',
        backgroundColor: getColor(),
        borderRadius: radius
    });

    var animation;
    container.doSwitch = function () {
        state = !state;
        if (animation) animation.cancel();
        animation = theSwitch.animate({
            backgroundColor: getColor(),
            left: getLeft()
        });
        listeners.forEach(function (listener) {
            listener(state);
        });
        return false;
    };

    container.onSwitch = function (listener) {
        listeners.push(listener);
        return container;
    };

    return container.append(theSwitch).on('click', container.doSwitch);
};


exports.createSlider = function (options) {

    options = options || {};
    var size = options.size || 0.5; //cm
    var value = options.value || 0;
    var color = options.color || colors.bright;

    var container = F.node('div').style({
        position: 'relative',
        height: cm(size * 1.2)
    });

    var slider = F.node('div').style({
        borderRadius: '50%',
        cursor: 'pointer',
        width: cm(size), height: cm(size),
        backgroundColor: color,
        position: 'absolute',
        top: 0, bottom: 0,
        marginTop: 'auto', marginBottom: 'auto'
    });

    var bar = F.node('div').style(center).style({
        backgroundColor: colors.dark,
        width: 'calc(100% - ' + cm(size) + ')',
        height: cm(size * 0.1)
    });

    var listeners = [];
    container.onSlide = function (listener) {
        listeners.push(listener);
        return container;
    };

    var update = function (x) {
        var totalWidth = container.box().width;
        value = xToPercent(x, totalWidth);
        var left = valueToLeft(value, totalWidth);
        slider.style('left', left);
        listeners.forEach(function (listener) {
            listener(value);
        });
    };

    var valueToLeft = function (value, totalWidth) {
        var sizeInPx = cmToPx(size);
        var maxX = totalWidth - sizeInPx;
        var maxLeft = maxX / totalWidth;
        return Math.round(value * maxLeft * 100) + '%';
    };

    var xToPercent = function (x, totalWidth) {
        var sizeInPx = cmToPx(size);
        var minX = sizeInPx / 2;
        var maxX = totalWidth - sizeInPx / 2;
        x = Math.min(maxX, Math.max(minX, x));
        return ((x - minX) / (maxX - minX));
    };

    container.onAttached(function () {
        var totalWidth = container.box().width;
        var left = valueToLeft(value, totalWidth);
        slider.style('left', left);
    });

    Touches.listen(container, {
        onPan: function (origin, from, to) {
            update(to.x);
            return false;
        },
        onTap: function (origin) {
            update(origin.x);
            return false;
        }
    });

    return container.append(bar, slider);
};


exports.createAccordion = function (options) {
    options = options || {};
    var headerSize = options.headerSize || 0.5; //cm
    var singleMode = options.singleMode || false;
    var accordion = F.node('div').style({color: colors.bright});
    var sections = [];

    var createBody = function (element) {
        var padding = options.bodyPadding || 0.12; //cm
        var body = F.node('div').style({
            backgroundColor: colors.darker,
            overflow: 'hidden',
            height: '0px'
        }).append(element.style({
            marginTop: cm(padding),
            marginBottom: cm(padding)
        }));
        var animation;
        body.show = function () {
            if (animation) animation.cancel();
            var size = element.box().height + cmToPx(padding * 2);
            animation = body.animate({height: size + 'px'});
        };
        body.hide = function () {
            if (animation) animation.cancel();
            animation = body.animate({height: '0px'});
        };
        return body;
    };

    var createIcon = function () {
        var size = cm(headerSize * 0.8);
        var icon = exports.createIcon('/images/triangle.svg')
            .style({
                height: size, width: size,
                marginRight: cm(0.25),
                marginLeft: cm(0.12),
                verticalAlign: 'middle'
            });
        var animation;
        icon.show = function () {
            if (animation) animation.cancel();
            animation = icon.animate({rotate: '90deg'});
        };
        icon.hide = function () {
            if (animation) animation.cancel();
            animation = icon.animate({rotate: '0deg'});
        };
        return icon;
    };

    var createHeader = function (title, toggle) {
        var icon = createIcon(toggle);
        var label = F.node('span')
            .text(title)
            .style({
                cursor: 'pointer',
                verticalAlign: 'middle'
            });
        var header = F.node('div')
            .style({
                height: cm(headerSize),
                lineHeight: cm(headerSize),
                textAlign: 'left',
                width: '100%',
                backgroundColor: colors.dark,
                cursor: 'pointer'
            });
        header.append(icon, label);
        header.show = icon.show;
        header.hide = icon.hide;
        return header;
    };

    var createToggle = function (section) {
        var shown = false;

        section.show = function () {
            if (shown) return;
            shown = true;
            section.header.show();
            section.body.show();
        };
        section.hide = function () {
            if (!shown) return;
            shown = false;
            section.header.hide();
            section.body.hide();
        };

        return function () {
            shown ? section.hide() : section.show();
            if (shown && singleMode) {
                sections.forEach(function (other) {
                    if (other != section) other.hide();
                });
            }
            return false;
        };
    };

    accordion.addSection = function (title, element) {
        var body = createBody(element);
        var header = createHeader(title);
        var section = {header: header, body: body};
        sections.push(section);
        var toggle = createToggle(section);
        header.on('click', toggle);
        accordion.append(header, body);
        return accordion;
    };

    return accordion;
};

exports.createWaitingIcon = function (options) {
    options = options || {};

    var delay = options.delay || 0;
    var canvas = F.node('canvas');
    var context, width, height;
    var size, color, stop;
    var factor = 0.8;

    var timeout;
    var start = function () {
        if (timeout) return;
        timeout = setTimeout(function () {
            timeout = null;
            var raw = canvas.raw();
            var box = canvas.box();
            raw.width = width = box.width;
            raw.height = height = box.height;
            context = raw.getContext('2d');
            color = Colors.random();
            grow();
        }, delay);
    };

    var grow = function () {
        Animator.tween({
            from: 0, to: factor,
            onTick: function (value) {
                size = value;
                draw();
            },
            onComplete: doPulse
        });
    };

    var shrink = function () {
        Animator.tween({
            from: factor, to: 0,
            onTick: function (value) {
                size = value;
                draw();
            },
            onComplete: stop
        });
    };

    var doPulse = function () {
        if (stop) return shrink();
        var oldColor = color;
        var newColor = Colors.random();
        Animator.tween({
            from: 0,
            to: 1,
            duration: 1000,
            easing: Animator.easings.fastSlowFast,
            onTick: function (value) {
                size = factor - interpolateSize(value) * (1 - factor);
                color.r = oldColor.r + (newColor.r - oldColor.r) * value;
                color.g = oldColor.g + (newColor.g - oldColor.g) * value;
                color.b = oldColor.b + (newColor.b - oldColor.b) * value;
                draw();
            },
            onDone: function () {
                color = newColor;
                doPulse();
            }
        });
    };

    var interpolateSize = function (value) {
        value = value * 2 - 1;
        value = value * value;
        return 1 - value;
    };

    var draw = function () {
        context.clearRect(0, 0, width, height);
        context.beginPath();
        var _width = width * size;
        var _height = height * size;
        context.rect((width - _width) / 2, (height - _height) / 2, _width, _height);
        context.fillStyle = Colors.rgbToHex(color);
        context.fill();
    };

    canvas.stop = function (onStopped) {
        if (timeout) {
            clearTimeout(timeout);
            setTimeout(onStopped, 0);
            return canvas;
        }
        stop = onStopped;
        return canvas;
    };

    canvas.onAttached(start);
    return canvas;
};

exports.createWorkingIcon = function (numberOfRows, numberOfColumns, source) {
    var canvas = F.node('canvas').style({opacity: 0});

    var animation;
    var show = function (onComplete) {
        if (animation) animation.cancel();
        animation = canvas.animate({opacity: 1}, {onComplete: onComplete});
    };
    var hide = function (onComplete) {
        if (animation) animation.cancel();
        animation = canvas.animate({opacity: 0}, {onComplete: onComplete});
    };

    var width, height, context, stopRequest;
    var tiles = [];
    var tileWidth, tileHeight, padding;
    var gap = {row: 0, column: 0};
    var lastGap = {row: 0, column: 0};

    var dividable = function (value, factor) {
        return Math.floor(value / factor) * factor;
    };

    var initializeCanvas = function (onDone) {
        var box = canvas.box();
        var raw = canvas.raw();
        width = raw.width = dividable(box.width, numberOfColumns);
        height = raw.height = dividable(box.height, numberOfRows);
        tileWidth = width / numberOfColumns;
        tileHeight = height / numberOfRows;
        padding = Math.round(Math.max(tileWidth, tileHeight) * 0.1);
        context = raw.getContext('2d');
        if (source) return loadImage(onDone);
        context.beginPath();
        context.rect(0, 0, width, height);
        context.fillStyle = '#303030';
        context.fill();
        onDone();
    };

    var loadImage = function (onDone) {
        var image = new Image(width, height);
        image.onload = function () {
            context.drawImage(image, 0, 0, width, height);
            image = null;
            onDone();
        };
        image.src = source;
    };

    var render = function () {
        context.clearRect(0, 0, width, height);
        for (var row = 0; row < numberOfRows; row++) {
            for (var column = 0; column < numberOfColumns; column++) {
                var tile = tiles[row][column];
                if (tile) tile.render();
            }
        }
    };

    var start = function () {
        initializeCanvas(function () {
            createTiles();
            render();
            removeOneTile();
            show(function () {
                allTiles('spread', slideToGap);
            });
        });
    };

    var createTiles = function () {
        for (var row = 0; row < numberOfRows; row++) {
            tiles[row] = [];
            for (var column = 0; column < numberOfColumns; column++) {
                tiles[row][column] = createTile(row, column);
            }
        }
    };

    var createTile = function (row, column) {
        var x = (width - tileWidth) / 2;
        var y = (height - tileHeight) / 2;
        var tile = {};
        var opacity = 0;

        (function () {
            var myCanvas = F.node('canvas').raw();
            var myWidth = myCanvas.width = tileWidth - 2 * padding;
            var myHeight = myCanvas.height = tileHeight - 2 * padding;
            var myContext = myCanvas.getContext('2d');
            var originX = column * tileWidth;
            var originY = row * tileHeight;
            myContext.drawImage(canvas.raw(), originX + padding, originY + padding, myWidth, myHeight, 0, 0, myWidth, myHeight);

            tile.render = function () {
                context.drawImage(myCanvas, x + padding, y + padding);
            };
        })();

        tile.slideTo = function (_row, _column, onDone, delay) {
            var startX = x;
            var startY = y;
            var targetX = _column * tileWidth;
            var targetY = _row * tileHeight;
            Animator.start({
                from: 0, to: 1, onDone: onDone, delay: delay, onTick: function (value) {
                    x = startX + (targetX - startX) * value;
                    y = startY + (targetY - startY) * value;
                    render();
                }
            });
        };

        tile.center = function (delay, onDone) {
            tile.slideTo(Math.floor(numberOfRows / 2), Math.floor(numberOfColumns / 2), onDone, delay);
        };

        tile.spread = function (delay, onDone) {
            tile.slideTo(row, column, onDone, delay);
        };

        return tile;
    };


    var copyIndices = function (source, sink) {
        sink.row = source['row'];
        sink.column = source['column'];
    };

    var removeOneTile = function () {
        gap.row = Math.round(Math.random() * (numberOfRows - 1));
        gap.column = Math.round(Math.random() * (numberOfColumns - 1));
        copyIndices(gap, lastGap);
        tiles[gap.row][gap.column] = null;
    };

    var slideToGap = function () {
        var neighbor;
        do {
            neighbor = chooseNeighbor();
        } while (neighbor.row == lastGap.row && neighbor.column == lastGap.column);
        neighbor.tile.slideTo(gap.row, gap.column, function () {
            tiles[gap.row][gap.column] = neighbor.tile;
            tiles[neighbor.row][neighbor.column] = null;
            copyIndices(gap, lastGap);
            copyIndices(neighbor, gap);
            if (stopRequest) stopRequest();
            else slideToGap();
        });
    };

    var chooseNeighbor = function () {
        var possibilities = [];
        if (gap.row > 0) possibilities.push({row: -1});
        if (gap.row < (numberOfRows - 1)) possibilities.push({row: 1});
        if (gap.column > 0) possibilities.push({column: -1});
        if (gap.column < (numberOfColumns - 1)) possibilities.push({column: 1});
        var pivot = possibilities[Math.floor(Math.random() * possibilities.length)];
        var row = gap.row + (pivot.row || 0);
        var column = gap.column + (pivot.column || 0);
        return {row: row, column: column, tile: tiles[row][column]};
    };

    var allTiles = function (handler, onDone) {
        var waitingFor = numberOfColumns * numberOfRows - 1;
        var countDown = function () {
            waitingFor--;
            if (!waitingFor && onDone) onDone();
        };
        for (var row = 0; row < numberOfRows; row++) {
            for (var column = 0; column < numberOfColumns; column++) {
                var tile = tiles[row][column];
                var delay = (row + column) * 100;
                if (tile) tile[handler](delay, countDown);
            }
        }
    };

    var stop = function (onDone) {
        stopRequest = function () {
            allTiles('center', function () {
                hide(onDone);
            });
        }
    };

    canvas.onAttached(start);
    canvas.stop = stop;
    return canvas;
};


exports.renderDate = function (date, size) {
    size = size || 1;
    var container = F.node('div').style({display: 'inline-block'});
    var icon = exports.createIcon(
        '/images/date.svg',
        {color: colors.bright, imageSize: '50%'})
        .style({
            width: cm(size), height: cm(size),
            verticalAlign: 'middle'
        });
    var dayString = F.node('span').text(date.toLocaleDateString());
    var timeString = F.node('span').text(date.toLocaleTimeString());
    var label = F.node('div')
        .style({
            textAlign: 'right',
            display: 'inline-block',
            fontSize: cm(size * 0.3), lineHeight: cm(size * 0.33),
            verticalAlign: 'middle'
        })
        .append(dayString, F.node('br'), timeString);
    return container.append(icon, label);
};


var center = {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    margin: 'auto'
};