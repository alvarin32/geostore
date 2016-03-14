var Colors = require('commons/colors');
var Commons = require('commons');

var numericInterpolation = function (from, to, progress) {
    return from + (to - from) * progress;
};


/*
 *  animated = {
 *       from : <value or function():value>,
 *       to: <value or function():value>,
 *       onTick: <function(value, started, now, progress):void>,
 *       [duration: <ms>] (default=300),
 *       [easing: <function(progress):progress>],
 *       [interpolate: <function(from, to, progress):value>],
 *       [onDone: <function():void>],
 *       [onComplete: <function():void>],
 *       [onCanceled: <function():void]
 *  }
 * */
var startTween = function (animated) {

    var easing = animated.easing || quadratic;
    var interpolate = animated.interpolate || numericInterpolation;
    var duration = animated.duration || 300;
    var started, from, to;
    var canceled, isDone, isComplete;

    var onDone = function () {
        isDone = true;
        if (animated.onDone) animated.onDone();
    };

    var tick = function () {
        if (!canceled) {
            var now = (new Date).getTime();
            var progress = Math.min(1, (now - started) / duration);
            var translatedProgress = easing(progress);
            var value = interpolate(from, to, translatedProgress);
            animated.onTick(value, started, now);
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
        started = (new Date).getTime();
        from = isFunction(animated.from) ? animated.from() : animated.from;
        to = isFunction(animated.to) ? animated.to() : animated.to;
        if (Commons.equals(from, to)) {
            return window.requestAnimationFrame(function () {
                isComplete = true;
                if (animated.onComplete) animated.onComplete();
                onDone();
            });
        }
        if (from.unit != to.unit) {
            console.log('warning: animating from ' + from.unit + ' to ' + to.unit);
        }
        window.requestAnimationFrame(tick);
    };

    start();

    return {
        isDone: function () {
            return isDone;
        },
        isComplete: function () {
            return isComplete;
        },
        cancel: function () {
            canceled = true;
        }
    };
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

    var started, canceled, isDone, isComplete;

    var tick = function () {
        if (!canceled) {
            var now = (new Date).getTime();
            isComplete = loop.doLoop(now, started);
            if (!isComplete) {
                return window.requestAnimationFrame(tick);
            }
            if (loop.onComplete) loop.onComplete();
        } else if (loop.onCanceled) {
            loop.onCanceled();
        }
        if (loop.onDone) loop.onDone();
    };

    var start = function () {
        started = (new Date).getTime();
        window.requestAnimationFrame(tick);
    }

    start();

    return {
        cancel: function () {
            canceled = true;
        },
        isDone: function () {
            return isDone;
        },
        isComplete: function () {
            return isComplete;
        }
    };
};


var tweenDom = function (node, targets, options) {
    options = options || {};
    var animated = targetsToAnimated(node, targets);
    if (options.onTick) {
        var userOnTick = options.onTick;
        var systemOnTick = animated.onTick;
        delete options.onTick;
        animated.onTick = function () {
            systemOnTick.apply(this, arguments);
            userOnTick.apply(this, arguments);
        };
    }
    for (var key in options) animated[key] = options[key];
    return delayedTween(animated);
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
        onTick: function (value) {
            for (var i = 0; i < length; i++) {
                var animated = animateds[i];
                var interpolatedValue = animated.interpolate(animated.from, animated.to, value);
                animated.onTick(interpolatedValue);
            }
        }
    }
};

var targetToAnimated = function (node, property, target) {
    var expert = createExpert(property);
    return {
        from: function () {
            if (isObject(target) && 'from' in target) {
                var value = isFunction(target.from) ? target.from() : target.from;
                return expert.parse(value);
            }
            return expert.get(node);
        },
        to: function () {
            if (isObject(target) && 'to' in target) {
                var value = isFunction(target.to) ? target.to() : target.to;
                return expert.parse(value);
            }
            return expert.parse(target);
        },
        interpolate: function (from, to, progress) {
            return expert.interpolate(from, to, progress);
        },
        onTick: function (value) {
            expert.set(node, value);
        }
    };
};

var createNumericExpert = function (property, mode, defaults) {
    var workingPiece = {};
    return {
        get: function (node) {
            var value = node[mode](property);
            if (value == undefined) return {value: defaults.value, unit: defaults.unit};
            return parseNumeric(value, defaults.unit);
        },
        parse: function (value) {
            return parseNumeric(value, defaults.unit);
        },
        set: function (node, numeric) {
            value = numeric.unit ? (numeric.value + numeric.unit) : numeric.value;
            node[mode](property, value);
        },
        interpolate: function (from, to, progress) {
            workingPiece.value = from.value + (to.value - from.value) * progress;
            workingPiece.unit = to.unit;
            return workingPiece;
        }
    }
};


var createColorExpert = function (property) {
    var workingPiece = Colors.rgb();
    return {
        get: function (node) {
            var value = node.style(property);
            return Colors.parseRgb(value) || Colors.rgb();
        },
        parse: function (target) {
            return Colors.parseRgb(target) || Colors.rgb();
        },
        set: function (node, color) {
            node.style(property, color.toString());
        },
        interpolate: function (from, to, progress) {
            workingPiece.r = Math.round(from.r + (to.r - from.r) * progress);
            workingPiece.g = Math.round(from.g + (to.g - from.g) * progress);
            workingPiece.b = Math.round(from.b + (to.b - from.b) * progress);
            workingPiece.a = from.a + (to.a - from.a) * progress;
            return workingPiece;
        }
    }
}

var parseNumeric = function (value, defaultUnit) {
    if (isString(value)) {
        var unitStart = value.search(/[^0-9\-\.\+]/);
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


var createPxStyleExpert = function (property) {
    return createNumericExpert(property, 'style', {value: 0, unit: 'px'});
};

var createScaleExpert = function (property) {
    return createNumericExpert(property, 'transform', {value: 1, unit: false});
};

var createRotateExpert = function () {
    return createNumericExpert('rotate', 'transform', {value: 0, unit: 'deg'});
};

var createOpacityExpert = function () {
    return createNumericExpert('opacity', 'style', {value: 1, unit: false});
};


var expertFactories = {
    width: createPxStyleExpert,
    height: createPxStyleExpert,
    bottom: createPxStyleExpert,
    top: createPxStyleExpert,
    left: createPxStyleExpert,
    right: createPxStyleExpert,
    x: createPxStyleExpert,
    y: createPxStyleExpert,
    backgroundColor: createColorExpert,
    borderColor: createColorExpert,
    color: createColorExpert,
    scaleX: createScaleExpert,
    scaleY: createScaleExpert,
    rotate: createRotateExpert,
    opacity: createOpacityExpert,
    margin: createPxStyleExpert,
    padding: createPxStyleExpert,
    marginTop: createPxStyleExpert,
    marginLeft: createPxStyleExpert,
    marginRight: createPxStyleExpert,
    marginBottom: createPxStyleExpert
};

var createExpert = function (property) {
    var factory = expertFactories[property];
    if (!factory) throw 'the property ' + property + ' can not be animated yet.';
    return factory(property);
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

var delayed = function (action, parameters, delay) {

    var animation;

    var timeout = setTimeout(function () {
        timeout = null;
        animation = action.apply(this, parameters);
    }, delay);

    return {
        cancel: function () {
            if (animation) animation.cancel();
            else clearTimeout(timeout);
        },
        isDone: function () {
            return animation && animation.isDone();
        },
        isComplete: function () {
            return animation && animation.isComplete();
        }
    }

};

var delayedTween = function (animated) {
    if (!animated.delay) return startTween(animated);
    var delay = animated.delay;
    delete animated.delay;
    return delayed(startTween, [animated], delay);
};

var delayedLoop = function (loop) {
    if (!loop.delay) return startLoop(loop);
    var delay = loop.delay;
    delete loop.delay;
    return delayed(startLoop, [loop], delay);
};

var bounceOut = function (value) {
    var span = 3;
    value = (value * span) - span;
    if (value == 0) return 1;
    value = value * Math.PI;
    return Math.sin(value) / value;
};

var bounceIn = function (value) {
    var span = 3;
    value = value * span;
    if (value == 0) return 1;
    value = value * Math.PI
    return Math.sin(value) / value;
};

var bounce = function (value) {
    var span = 3.5;
    value = (span * 2 * value) - span;
    if (value == 0) return 1;
    value = value * Math.PI;
    return Math.sin(value) / value;
};

var quadratic = function (value) {
    return value * value;
};

var inverseQuadratic = function (value) {
    return Math.sqrt(value);
};

var linear = function (value) {
    return value;
};

var fastSlowFast = function (value) {
    var factor = 0.7;
    value = value * 2 - 1;
    var toThree = (value * value * value);
    value = factor * toThree + (1 - factor) * value;
    value = (value + 1) / 2;
    return value;
};


var combine = function () {
    var chain = arguments;
    return function (value) {
        console.log(value);
        for (var i = 0; i < chain.length; i++) {
            value = chain[i](value);
            console.log(value);
        }
        return value;
    };
};

var isObject = function (value) {
    return value && Object(value) === value;
};


module.exports = {
    tween: delayedTween,
    loop: delayedLoop,
    dom: tweenDom,
    queued: queued,
    easings: {
        bounceOut: bounceOut,
        bounceIn: bounceIn,
        bounce: bounce,
        quadratic: quadratic,
        linear: linear,
        inverseQuadratic: inverseQuadratic,
        fastSlowFast: fastSlowFast,
        combine: combine
    }
};