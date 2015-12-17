var Colors = require('commons/colors');

var defaultEasing = function (value) {
    return value * value;
};


/*
 *  animated = {
 *       from : <value or function():value>,
 *       to: <value or function():value>,
 *       onTick: <function(value, started, now, progress):void>,
 *       [interpolate: <function(from, to, progress):value>] (default=numeric interpolation)
 *       [duration: <ms>] (default=300),
 *       [delay: <ms>] (default=0),
 *       [easing: <function(progress):progress>] (default=progress*progress),
 *       [onDone: <function():void>],
 *       [onComplete: <function():void>],
 *       [onCanceled: <function():void]
 *  }
 * */
var animate = function (animated) {
    animated.easing = animated.easing || defaultEasing;
    animated.duration = animated.duration || 300;
    animated.interpolate = animated.interpolate || numericInterpolation;
    var started = null;
    var from = null;
    var to = null;
    var canceled = false;
    var isDone = false;
    var isComplete = false;
    var timeout = null;
    var onDone = function () {
        isDone = true;
        if (animated.onDone) animated.onDone();
    };
    var tick = function () {
        if (!canceled) {
            var now = (new Date).getTime();
            var progress = Math.min(1, (now - started) / animated.duration);
            var translatedProgress = animated.easing(progress);
            var value = animated.interpolate(from, to, translatedProgress);
            animated.onTick(value, started, now, progress);
            isComplete = (progress >= 1);
            if (isComplete) {
                if (animated.onComplete) animated.onComplete();
            } else {
                window.requestAnimationFrame(tick);
                return;
            }
        } else if (animated.onCanceled) {
            animated.onCanceled();
        }
        onDone();
    };
    var start = function () {
        from = isFunction(animated.from) ? animated.from() : animated.from;
        to = isFunction(animated.to) ? animated.to() : animated.to;
        if (from == to || from.unit && (from.value == to.value && from.unit == to.unit)) {
            return window.requestAnimationFrame(function () {
                isComplete = true;
                if (animated.onComplete) animated.onComplete();
                onDone();
            });
        }
        if (from.unit != to.unit) {
            console.log('warning: animating from ' + from.unit + ' to ' + to.unit);
        }
        started = (new Date).getTime();
        window.requestAnimationFrame(tick);
    };
    var animation = {
        isDone: function () {
            return isDone;
        },
        isComplete: function () {
            return isComplete;
        },
        cancel: function () {
            if (!canceled && !isDone) {
                canceled = true;
                if (!started) {
                    if(timeout) window.clearTimeout(timeout);
                    window.requestAnimationFrame(tick);
                }
            }
        }
    };
    if(animated.delay){
        timeout = setTimeout(start, animated.delay);
    }else{
        start();
    }
    return animation;
};


/*
 * var loop = {
 *       doLoop : <function(progress, started, now):boolean> (true means stop!)
 *       [onComplete: <function():void>],
 *       [onCanceled: <function():void>],
 *       [onDone: <function():void>]
 * }
 * */
var startLoop = function (loop) {
    var started = (new Date).getTime();
    var canceled = false;
    var isDone = false;
    var isComplete = false;
    var tick = function () {
        if (!canceled) {
            var now = (new Date).getTime();
            var progress = loop.duration ? Math.min(1, (now - started) / loop.duration) : 1;
            isComplete = loop.doLoop(now, started, progress);
            if (!isComplete) {
                window.requestAnimationFrame(tick);
                return;
            } else if (loop.onComplete) {
                loop.onComplete();
            }
        } else if (loop.onCanceled) {
            loop.onCanceled();
        }
        if (loop.onDone) loop.onDone();
    };
    window.requestAnimationFrame(tick);
    return {
        cancel: function () {
            canceled = true;
        },
        isDone: function () {
            return isDone;
        }
    }
};


var animateDom = function (node, targets, options) {
    options = options || {};
    var animated;
    if (Object.keys(targets).length > 1) {
        animated = targetsToAnimated(node, targets);
    } else {
        for (var property in targets) animated = targetToAnimated(node, property, targets[property]);
    }
    animated.duration = options.duration || animated.duration;
    if (options.onTick) {
        var actualOnTick = animated.onTick;
        animated.onTick = function (value, started, now, progress) {
            actualOnTick(value, started, now, progress);
            options.onTick(value, started, now, progress);
        };
    }
    animated.delay = options.delay || animated.delay;
    animated.easing = options.easing || animated.easing;
    animated.onDone = options.onDone || animated.onDone;
    animated.onComplete = options.onComplete || animated.onComplete;
    animated.onCanceled = options.onCanceled || animated.onCanceled;
    return animate(animated);
};

var targetsToAnimated = function (node, targets) {
    var animateds = [];
    for (var property in targets) {
        var target = targets[property];
        animateds.push(targetToAnimated(node, property, target));
    }
    var length = animateds.length;
    return {
        from: function () {
            for (var i = 0; i < length; i++) {
                var animated = animateds[i];
                animated.from = isFunction(animated.from) ? animated.from() : animated.from;
            }
            return 0;
        },
        to: function () {
            for (var i = 0; i < length; i++) {
                var animated = animateds[i];
                animated.to = isFunction(animated.to) ? animated.to() : animated.to;
            }
            return 1;
        },
        onTick: function (value, started, now, progress) {
            for (var i = 0; i < length; i++) {
                var animated = animateds[i];
                var interpolatedValue = animated.interpolate(animated.from, animated.to, progress);
                animated.onTick(interpolatedValue);
            }
        }
    }
};

var targetToAnimated = function (node, property, target) {
    var expert = createExpert(node, property);
    var parsedTarget = expert.parse(target, expert.defaultUnit);
    return {
        from: function () {
            var value = expert.get();
            return expert.parse(value, expert.defaultUnit);
        },
        to: parsedTarget,
        interpolate: function (from, to, progress) {
            return expert.interpolate(from.value, to.value, progress);
        },
        onTick: function (value) {
            expert.set(value, parsedTarget.unit);
        }
    };
};

var parseNumeric = function (value, defaultUnit) {
    if (isString(value)) {
        var unitStart = value.search(/[^-.0-9]/);
        if (unitStart > 0) {
            return {
                value: parseFloat(value.substr(0, unitStart)),
                unit: value.substr(unitStart)
            };
        }
        return {
            value: parseFloat(value),
            unit: defaultUnit
        };
    }
    return {
        value: value,
        unit: defaultUnit
    };
};

var parseColor = function (value) {
    var rgb = Colors.parseRgb(value);
    return {value: [rgb.r, rgb.g, rgb.b, rgb.a], unit: 'color'};
};


var roundAndJoinColor = function (numbers) {
    var result = '';
    for (var i = 0; i < 3; i++) {
        if (i > 0) {
            result += ', ';
        }
        result += Math.floor(numbers[i]);
    }
    if (numbers.length == 4) {
        result += ', ' + numbers[3];
    }
    return result;
};

var numericInterpolation = function (from, to, progress) {
    return from + (to - from) * progress;
};
var colorInterpolation = function (from, to, progress) {
    var result = [];
    var fromLength = from.length;
    var toLength = to.length;
    var maxLength = Math.max(fromLength, toLength);
    for (var i = 0; i < maxLength; i++) {
        var fromValue = (i < fromLength) ? from[i] : 1;
        var toValue = (i < toLength) ? to[i] : 1;
        result[i] = numericInterpolation(fromValue, toValue, progress);
    }
    return result;
};
var createSetter = function (node, property) {
    return function (value) {
        node.prop(property, value);
    };
};
var createGetter = function (node, property) {
    return function () {
        return node.prop(property);
    };
};
var createStyleGetter = function (node, property, defaultValue) {
    return function () {
        var value = node.style(property);
        if (isCssNull(value)) value = defaultValue;
        return value;
    }
};
var createStyleSetter = function (node, property) {
    return function (value, unit) {
        if (unit === 'color') {
            node.style(property, 'rgb' + (value.length > 3 ? 'a' : '')
                + '(' + roundAndJoinColor(value) + ')');
        } else {
            node.style(property, unit ? value + unit : value);
        }
    };
};
var createTransformGetter = function (node, property, defaultValue) {
    return function () {
        var result = node.transform(property);
        if (result == undefined) result = defaultValue;
        return result;
    };
};
var createTransformSetter = function (node, property) {
    return function (value, unit) {
        node.transform(property, unit ? value + unit : value);
    };
};
var factory = function (node, property, expert) {
    expert.set = createSetter(node, property);
    expert.get = createGetter(node, property, expert.defaultValue);
};
var styleFactory = function (node, property, expert) {
    expert.set = createStyleSetter(node, property);
    expert.get = createStyleGetter(node, property, expert.defaultValue);
};
var transformFactory = function (node, property, expert) {
    expert.set = createTransformSetter(node, property);
    expert.get = createTransformGetter(node, property, expert.defaultValue);
};
var black = 'rgb(0, 0, 0)';
var experts = {
    width: [numericInterpolation, styleFactory, 'px', 0],
    height: [numericInterpolation, styleFactory, 'px', 0],
    bottom: [numericInterpolation, styleFactory, 'px', 0],
    top: [numericInterpolation, styleFactory, 'px', 0],
    left: [numericInterpolation, styleFactory, 'px', 0],
    right: [numericInterpolation, styleFactory, 'px', 0],
    x: [numericInterpolation, styleFactory, 'px', 0],
    y: [numericInterpolation, styleFactory, 'px', 0],
    backgroundColor: [colorInterpolation, styleFactory, 'color', black],
    borderColor: [colorInterpolation, styleFactory, 'color', black],
    color: [colorInterpolation, styleFactory, 'color', black],
    scaleX: [numericInterpolation, transformFactory, false, 1],
    scaleY: [numericInterpolation, transformFactory, false, 1],
    rotate: [numericInterpolation, transformFactory, 'deg', 0],
    opacity: [numericInterpolation, styleFactory, false, 1],
    margin: [numericInterpolation, styleFactory, 'px', 0],
    padding: [numericInterpolation, styleFactory, 'px', 0],
    marginTop: [numericInterpolation, styleFactory, 'px', 0],
    marginLeft: [numericInterpolation, styleFactory, 'px', 0],
    marginRight: [numericInterpolation, styleFactory, 'px', 0],
    marginBottom: [numericInterpolation, styleFactory, 'px', 0]
};
var createExpert = function (node, property) {
    var expertConfig = experts[property];
    if (!expertConfig) throw "The property " + property + " can not be animated!";
    var expert = {};
    expert.interpolate = expertConfig[0];
    expert.parse = (expert.interpolate == numericInterpolation ? parseNumeric : parseColor);
    var factory = expertConfig[1];
    expert.defaultUnit = expertConfig[2];
    expert.defaultValue = expertConfig[3];
    factory(node, property, expert);
    return expert;
};


var queued = function () {
    var queue = [];
    var current;

    var next = function (object, parameters) {
        queue.push({object: object, parameters: parameters});
        if (!current) goOn();
    };

    var goOn = function () {
        var element = queue.shift();
        var object = element.object;
        var parameters = element.parameters;
        current = object.animate(parameters, {onDone: onDone});
    };

    var onDone = function () {
        current = null;
        if (queue.length) goOn();
    };

    return next;
};


module.exports = {
    start: animate,
    loop: startLoop,
    dom: animateDom,
    queued: queued
};