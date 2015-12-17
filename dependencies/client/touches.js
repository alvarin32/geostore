var animator = require('./animation');
var F = require('./fiat');

var Event = {
    DOWN: "DOWN",
    UP: "UP",
    MOVE: "MOVE",
    CANCEL: "CANCEL"
};

var Mode = {
    INITIAL: "INITIAL",
    TAPPING: "TAPPING",
    MOVING: "MOVING",
    PRESSING: "PRESSING"
};

var dummy = function () {
    //NOOP
};

var MAX_VELOCITY = cmToPx(0.5);
var cropVelocity = function (velocity) {
    velocity.xpms = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity.xpms));
    velocity.ypms = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity.ypms));
    return velocity;
};

var standardizeReceiver = function (receiver) {
    receiver = receiver || {};
    receiver.onUp = receiver.onUp || dummy;
    receiver.onDown = receiver.onDown || dummy;
    receiver.onTap = receiver.onTap || dummy;
    receiver.onLongPress = receiver.onLongPress || dummy;
    receiver.onPan = receiver.onPan || dummy;
    receiver.onPinch = receiver.onPinch || dummy;
    receiver.onSwipe = receiver.onSwipe || dummy;
    return receiver;
};

var standardizeOptions = function (options) {
    options = options || {};
    options.longPressTimeout = options.longPressTimeout || 400;
    options.tapUpTimeout = options.tapUpTimeout || 200;
    options.tapDownTimeout = options.tapDownTimeout || 200;
    options.pixelsTillMove = options.pixelsTillMove || 5;
    options.proximity = options.proximity || 20;
    options.minSwipeVelocity = options.minSwipeVelocity || 30;
    options.predicate = options.predicate || defaultPredicate;
    return options;
};

var computeDistance = function (a, b) {
    var x = a.x - b.x;
    var y = a.y - b.y;
    return Math.sqrt(x * x + y * y);
};

var stopTimer = function (timer) {
    if (timer != null) {
        window.clearInterval(timer);
    }
};

var updateVelocity = function (velocity, xpms, ypms, weight) {
    velocity.xpms = (1 - weight) * velocity.xpms + weight * xpms;
    velocity.ypms = (1 - weight) * velocity.ypms + weight * ypms;
};

var createPointer = function (id, receiver, options) {
    var pointer = {id: id};
    var mode = null;
    var origin = null;
    var currentLocation = null;
    var previousLocation = null;
    var currentTime = null;
    var previousTime = null;
    var longPressTimer = null;
    var tapUpTimer = null;
    var tapDownTimer = null;
    var tapCount = 0;
    var velocity = null;
    var onStop = null;
    pointer.onEvent = function (event, location, time) {
        startOrUpdate(location, time);
        if (!isIgnoredMove(event)) {
            stopTimers();
            handleEvent(event);
        }
    };
    var isIgnoredMove = function (event) {
        return event == Event.MOVE
            && (currentLocation == previousLocation
            || (mode == Mode.INITIAL
            && getDistanceTo(origin) < options.pixelsTillMove)); //TODO: check!
    };
    var handleEvent = function (event) {
        switch (event) {
            case Event.UP:
                receiver.onUp(currentLocation);
                onUp();
                break;
            case Event.DOWN:
                receiver.onDown(currentLocation);
                onDown();
                break;
            case Event.MOVE:
                trackVelocity();
                onMove();
                break;
            case Event.CANCEL:
                stop();
                break;
        }
    };
    var onDown = function () {
        switch (mode) {
            case Mode.INITIAL:
                tapCount = 1;
                longPressTimer = window.setInterval(onLongPressTimeout, options.longPressTimeout);
                break;
            case Mode.TAPPING:
                if (getDistanceTo(previousLocation) < options.proximity) {
                    tapCount++;
                    tapDownTimer = window.setInterval(onTapDownTimeout, options.tapDownTimeout);
                } else {
                    receiver.onTap(origin, tapCount);
                    switchMode(Mode.INITIAL);
                    onDown();
                }
                break;
        }
    };
    var onUp = function () {
        //noinspection FallThroughInSwitchStatementJS
        switch (mode) {
            case Mode.INITIAL:
                mode = Mode.TAPPING;
            case Mode.TAPPING:
                tapUpTimer = window.setInterval(onTapUpTimeout, options.tapUpTimeout);
                break;
            case Mode.MOVING:
                if (isFastEnoughForSwipe()) {
                    receiver.onSwipe(origin, cropVelocity(velocity));
                }
            case Mode.PRESSING:
                stop();
                break;
        }
    };
    var onMove = function () {
        //noinspection FallThroughInSwitchStatementJS
        switch (mode) {
            case Mode.INITIAL:
                mode = Mode.MOVING;
            case Mode.MOVING:
                receiver.onPan(origin, previousLocation, currentLocation);
                break;
        }
    };
    var onLongPressTimeout = function () {
        stopTimers();
        mode = Mode.PRESSING;
        receiver.onLongPress(origin);
        switchMode(Mode.MOVING);
    };
    var onTapDownTimeout = function () {
        stopTimers();
        receiver.onTap(origin, tapCount);
        switchMode(Mode.MOVING);
    };
    var onTapUpTimeout = function () {
        stopTimers();
        receiver.onTap(origin, tapCount);
        stop();
    };
    var startOrUpdate = function (location, time) {
        if (mode === null) {
            start(location, time);
        } else {
            update(location, time);
        }
    };
    var start = function (_origin, time) {
        origin = _origin;
        mode = Mode.INITIAL;
        currentLocation = origin;
        previousLocation = origin;
        currentTime = time;
        previousTime = time;
        velocity = {xpms: 0, ypms: 0};
    };
    var stop = function (isRestarting) {
        mode = null;
        origin = null;
        currentLocation = null;
        previousLocation = null;
        currentTime = null;
        previousTime = null;
        tapCount = 0;
        velocity = null;
        if (!isRestarting && onStop) {
            onStop(pointer); //TODO: check!
        }
    };
    var update = function (location, time) {
        previousTime = currentTime;
        previousLocation = currentLocation;
        currentLocation = location;
        currentTime = time;
    };
    var switchMode = function (newMode) {
        var origin = currentLocation;
        var time = currentTime;
        stop(true);
        start(origin, time);
        mode = newMode;
    };
    var stopTimers = function () {
        stopTimer(tapDownTimer);
        stopTimer(longPressTimer);
        stopTimer(tapUpTimer);
    };
    var trackVelocity = function () {
        var timeGap = currentTime - previousTime;
        if (timeGap > 0) {
            var xDistance = currentLocation.x - previousLocation.x;
            var yDistance = currentLocation.y - previousLocation.y;
            var xpms = (xDistance / timeGap);
            var ypms = (yDistance / timeGap);
            updateVelocity(velocity, xpms, ypms, 0.3);
        }
    };
    var isFastEnoughForSwipe = function () {
        var timeGap = currentTime - previousTime;
        return timeGap <= 100;
    };
    var getTranslationTo = function (reference) {
        return {
            x: currentLocation.x - reference.x,
            y: currentLocation.y - reference.y
        };
    };
    var getDistanceTo = function (reference) {
        var translation = getTranslationTo(reference);
        return Math.sqrt(Math.pow(translation.x, 2) + Math.pow(translation.y, 2));
    };
    pointer.getLastLocation = function () {
        return previousLocation;
    };
    pointer.getLocation = function () {
        return currentLocation;
    };
    return pointer;
};

var addMultiTouch = function (receiver, pointers) {
    var wrapper = {};
    wrapper.onUp = function (location) {
        if (onlyOneActive()) {
            receiver.onUp(location);
        }
    };
    wrapper.onDown = function (location) {
        if (onlyOneActive()) {
            receiver.onDown(location);
        }
    };
    wrapper.onTap = function (location, tapCount) {
        if (onlyOneActive()) {
            receiver.onTap(location, tapCount);
        }
    };
    wrapper.onLongPress = function (location) {
        if (onlyOneActive()) {
            receiver.onLongPress(location);
        }
    };
    wrapper.onPan = function (origin, from, to) {
        if (onlyOneActive()) {
            receiver.onPan(origin, from, to);
        } else {
            var partners = getPartners(origin);
            onMultiTouch(partners.a, partners.b);
        }
    };
    if (receiver.onWheel) wrapper.onWheel = receiver.onWheel;
    if (receiver.onHover) wrapper.onHover = receiver.onHover;
    wrapper.onSwipe = receiver.onSwipe;
    var onlyOneActive = function () {
        return pointers.length == 1;
    };
    var getPartners = function (origin) {
        var partners = {};
        for (var id in pointers.ids) {
            var partner = pointers.ids[id];
            if (partner.origin != origin) {
                partners.a = partner;
            } else {
                partners.b = partner;
            }
        }
        return partners;
    };
    var onMultiTouch = function (pointerA, pointerB) {
        //pinch:
        var center = {
            x: (pointerA.origin.x + pointerB.origin.x) / 2,
            y: (pointerA.origin.y + pointerB.origin.y) / 2
        };
        var oldDistance = computeDistance(pointerA.getLastLocation(), pointerB.getLastLocation());
        var newDistance = computeDistance(pointerA.getLocation(), pointerB.getLocation());
        if (oldDistance > 0) {
            var scale = newDistance / oldDistance;
            receiver.onPinch(center, scale);
        }
    };
    return wrapper;
};

var createRouter = function (receiver, options) {
    var router = {};
    var pointers = {length: 0, ids: {}};
    receiver = addMultiTouch(receiver, pointers);
    router.onUp = function (id, location, time) {
        var pointer = getPointer(id);
        pointer.onEvent(Event.UP, location, time);
    };
    router.onDown = function (id, location, time) {
        var pointer = getPointer(id);
        pointer.onEvent(Event.DOWN, location, time);
    };
    router.onMove = function (id, location, time) {
        var pointer = getPointer(id);
        return pointer.onEvent(Event.MOVE, location, time);
    };
    router.onCancel = function (id, location, time) {
        var pointer = getPointer(id);
        pointer.onEvent(Event.CANCEL, location, time);
    };
    if (receiver.onWheel) {
        router.onWheel = function (location, delta) {
            return receiver.onWheel(location, delta);
        };
    }
    if (receiver.onHover) {
        router.onHover = function (location) {
            return receiver.onHover(location);
        };
    }
    var getPointer = function (id) {
        if (id in pointers.ids) {
            return pointers.ids[id];
        }
        var pointer = createPointer(id, receiver, options);
        pointer.onStop = function (pointer) {
            delete pointers.ids[pointer.id];
            pointers.length--;
        };
        pointers.ids[id] = pointer;
        pointers.length++;
        return pointer;
    };
    return router;
};

var listenToTouches = function (router, element, predicate) {
    var register = createTouchRegistrator(element, predicate);
    register("touchstart", function (id, location, time) {
        router.onDown(id, location, time);
        return false;
    });
    register("touchend", function (id, location, time) {
        router.onUp(id, location, time);
        return false;
    });
    register("touchmove", function (id, location, time) {
        router.onMove(id, location, time);
        return false;
    });
    register("touchcancel", function (id, location, time) {
        router.onCancel(id, location, time);
    });
};


var listenToMouse = function (router, element, predicate) {
    var register = createMouseRegistrator(element, predicate);
    var mouseIsDown = false;
    register("mousedown", function (event, location, time) {
        mouseIsDown = true;
        router.onDown(0, location, time);
        return false;
    });
    register("mouseup mouseleave", function (event, location, time) {
        if (mouseIsDown) {
            mouseIsDown = false;
            router.onUp(0, location, time);
            return false;
        }
    });
    register("mousemove", function (event, location, time) {
        if (mouseIsDown) {
            router.onMove(0, location, time);
            return false;
        } else if (router.onHover) {
            return router.onHover(location, event);
        }
    });
    element.on('click', function(){return false;});
    if (router.onWheel) {
        registerWheel(router, register);
    }
};

var registerWheel = function (router, register) {
    var animation = null;
    var onComplete = function () {
        animation = null;
    };
    register("mousewheel DOMMouseScroll MozMousePixelScroll", function (event, location) {
        if ((!event.detail || event.detail == 0) && (!event.wheelDelta || event.wheelDelta == 0)) return;
        var delta = (event.detail < 0 || event.wheelDelta > 0) ? 1 : -1;
        if (!animation || animation.delta != delta) {
            if (animation) animation.cancel();
            animation = animator.start({
                from: 0, to: 1, duration: 200, onTick: function () {
                    router.onWheel(location, delta);
                }, onComplete: onComplete
            });
            animation.delta = delta;
        }
        return false;
    });
};

var createMouseRegistrator = function (element, predicate) {
    return function (eventType, handler) {
        element.on(eventType, function (event) {
            if (predicate(event)) {
                var location = getLocation(event, element);
                var time = event.timeStamp;
                return handler(event, location, time);
            }
        }, false);
    };
};

var createTouchRegistrator = function (element, predicate) {
    return function (eventType, handler) {
        element.on(eventType, function (event) {
            var changedTouches = event.changedTouches;
            var result = true;
            for (var i = 0; i < changedTouches.length; i++) {
                var touch = changedTouches[i];
                if (predicate(touch)) {
                    var id = touch.identifier;
                    var location = getLocation(touch, element);
                    var time = event.timeStamp;
                    result = result && handler(id, location, time);
                }
            }
            return result;
        }, false);
    };
};


var getLocation = function (event, element) {
    var box = element.box();
    return {
        x: event.clientX - box.left,
        y: event.clientY - box.top
    };
};

var listen = function (element, receiver, options) {
    receiver = standardizeReceiver(receiver);
    options = standardizeOptions(options);
    var router = createRouter(receiver, options);
    listenToTouches(router, element, options.predicate);
    listenToMouse(router, element, options.predicate);
};

var defaultPredicate = function (event) {
    var active = document.activeElement;
    if (active && !isPointPadEnabled(F.getNode(active))) {
        return false;
    }
    var target = F.getNode(event.target || event.srcElement);
    return isPointPadEnabled(target);
};


var KEY = 'pointPad';
var isPointPadEnabled = function (node) {
    var current = node;
    while (current != null) {
        if (KEY in current) {
            var result = current[KEY];
            node[KEY] = result;
            return result;
        }
        current = current.parent();
    }
    return true;
};


module.exports = {
    listen: listen,
    defaultPredicate: defaultPredicate
};