var Commons = require('commons');
var Animator = require('./animation');


var node = function (tagName) {
    var element = document.createElement(tagName);
    return wrap(element);
};

var text = function (text) {
    var element = document.createTextNode(text);
    return wrap(element);
};

var getNode = function (idOrElement) {
    var element = isString(idOrElement) ? document.getElementById(idOrElement) : idOrElement;
    if (!element) return null;
    if (!element.fnode) {
        element.fnode = wrap(element);
    }
    return element.fnode;
};

var wrap = function (element) {
    if (element.fnode) return element.fnode;
    var node = {
        attached: (element == document.body),
        attachHandlers: [],
        detachHandlers: [],
        listeners: {}
    };
    element.fnode = node;
    var wrapListener = function (listener) {
        return function (event) {
            var result = listener(event);
            if (result != undefined && !result) {
                event.preventDefault();
                event.stopPropagation();
            }
            return result;
        }
    };
    var addListener = function (event, listener, useCapture) {
        var wrapper = wrapListener(listener);
        var entry = {listener: listener, wrapper: wrapper, useCapture: useCapture};
        element.addEventListener(event, wrapper, useCapture);
        if (!node.listeners[event]) {
            node.listeners[event] = [];
        }
        node.listeners[event].push(entry);
    };
    var removeListener = function (event, listener, useCapture) {
        if (event in node.listeners) {
            var predicate = function (entry) {
                return entry.listener == listener
                    && entry.useCapture == useCapture;
            };
            var listeners = node.listeners[event];
            var entry = Commons.remove(listeners, predicate);
            element.removeEventListener(event, entry.wrapper, entry.useCapture);
            if (listeners.length == 0) {
                delete node.listeners[event];
            }
        }
    };
    var removeAllListeners = function () {
        for (var event in node.listeners) {
            Commons.forEach(node.listeners[event], function (entry) {
                element.removeEventListener(event, entry.wrapper, entry.useCapture);
            });
        }
        node.listeners = {};
    };
    node.onAttached = function (handler, prepend) {
        if (handler != undefined) {
            prepend
                ? node.attachHandlers.unshift(handler)
                : node.attachHandlers.push(handler);
        } else if (!node.attached) {
            var i;
            node.attached = true;
            for (i = 0; i < node.attachHandlers.length; i++) {
                node.attachHandlers[i]();
            }
            var children = element.childNodes;
            for (i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.fnode) child.fnode.onAttached();
            }
        }
        return node;
    };
    node.onDetached = function (handler, prepend) {
        if (handler != undefined) {
            prepend
                ? node.detachHandlers.unshift(handler)
                : node.detachHandlers.push(handler);
        } else if (node.attached) {
            node.attached = false;
            var i;
            for (i = 0; i < node.detachHandlers.length; i++) {
                node.detachHandlers[i]();
            }
            var children = element.childNodes;
            for (i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.fnode) child.fnode.onDetached();
            }
        }
        return node;
    };
    node.raw = function () {
        return element;
    };
    node.append = function () {
        for (var i = 0; i < arguments.length; i++) {
            var child = arguments[i];
            element.appendChild(child.raw());
            if (node.attached) child.onAttached();
        }
        return node;
    };
    node.prepend = function () {
        var firstChild = element.firstChild;
        for (var i = 0; i < arguments.length; i++) {
            var child = arguments[i];
            element.insertBefore(child.raw(), firstChild);
            if (node.attached) child.onAttached();
        }
        return node;
    };
    node.appendTo = function (target) {
        target.raw().appendChild(element);
        if (target.attached) node.onAttached();
        return node;
    };
    node.prependTo = function (target) {
        var rawTarget = target.raw();
        rawTarget.insertBefore(element, rawTarget.firstChild);
        if (target.attached) node.onAttached();
        return node;
    };
    node.insertBefore = function () {
        var reference = arguments[0].raw();
        for (var i = 1; i < arguments.length; i++) {
            var child = arguments[i];
            element.insertBefore(child.raw(), reference);
            if (node.attached) child.onAttached();
        }
        return node;
    };
    node.clear = function () {
        while (element.lastChild) {
            var child = element.removeChild(element.lastChild);
            if (child.fnode) child.fnode.onDetached();
        }
        return node;
    };
    node.remove = function () {
        var parent = element.parentNode;
        if (parent) parent.removeChild(element);
        node.onDetached();
        return node;
    };
    node.parent = function () {
        var parent = element.parentNode;
        return getNode(parent);
    };
    node.on = function (events, handler, useCapture) {
        useCapture = (useCapture == true);
        Commons.forEach(events.split(' '), function (event) {
            addListener(event, handler, useCapture);
        });
        return node;
    };
    node.off = function () {
        if (arguments.length >= 2) {
            var events = arguments[0];
            var handler = arguments[1];
            var useCapture = (2 in arguments) ? (arguments[2] == true) : false;
            Commons.forEach(events.split(' '), function (event) {
                removeListener(event, handler, useCapture);
            });
        } else {
            removeAllListeners();
        }
        return node;
    };
    node.style = function (style, value) {
        if (arguments.length == 2) {
            element.style[style] = value;
            return node;
        }
        if (isString(style)) {
            if (style in element.style
                && !isCssNull(element.style[style])) {
                return element.style[style];
            }
            if (!node.styleCache) {
                node.styleCache = getComputedStyle(element, null);
            }
            return node.styleCache[style];
        }
        for (var key in style) {
            value = style[key];
            element.style[key] = value;
        }
        return node;
    };
    node.attr = function () {
        var value;
        if (arguments.length == 2) {
            value = arguments[1];
            if (value)
                element.setAttribute(arguments[0], value);
            else
                element.removeAttribute(arguments[0]);
            return node;
        }
        var argument = arguments[0];
        if (isString(argument)) {
            return element.getAttribute(argument);
        }
        for (var key in argument) {
            value = argument[key];
            if (value) element.setAttribute(key, value);
            else element.removeAttribute(key);
        }
        return node;
    };
    node.text = function (value) {
        if (arguments.length == 1) {
            element.textContent = value;
            return node;
        } else {
            return element.textContent;
        }
    };
    node.html = function (value) {
        if (arguments.length == 1) {
            element.innerHTML = value;
            return node;
        } else {
            return element.innerHTML;
        }
    };
    node.value = function (value) {
        if (arguments.length == 1) {
            element.value = value;
            return node;
        } else {
            return element.value;
        }
    };
    node.prop = function (prop, value) {
        if (value != undefined) {
            element[prop] = value;
            return node;
        }
        if (isString(prop)) {
            return element[prop];
        }
        for (var property in prop) {
            value = prop[property];
            element[property] = value;
        }
        return node;
    };
    node.transform = function (key, value) {
        var transform = element.style.transform || element.style.msTransform || element.style.webkitTransform;
        transform = transformToObject(transform);
        if (value != undefined) {
            transform[key] = value;
            transform = transformToString(transform);
            element.style.transform = transform;
            element.style.msTransform = transform;
            element.style.webkitTransform = transform;
            return node;
        }
        return transform[key];
    };
    node.blur = function () {
        element.blur();
        return node;
    };
    node.focus = function () {
        element.focus();
        return node;
    };
    node.animate = function (targets, options) {
        return Animator.dom(node, targets, options);
    };
    node.box = function (total) {
        var box = element.getBoundingClientRect();
        var result = {
            top: box.top, left: box.left,
            width: box.width, height: box.height,
            right: box.right, bottom: box.bottom
        };
        if (total) {
            var body = document.body;
            var docElem = document.documentElement;
            var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
            var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
            var clientTop = docElem.clientTop || body.clientTop || 0;
            var clientLeft = docElem.clientLeft || body.clientLeft || 0;
            var offsetTop = scrollTop - clientTop;
            var offsetLeft = scrollLeft - clientLeft;
            result.top += offsetTop;
            result.left += offsetLeft;
            result.right += offsetLeft;
            result.bottom += offsetTop;
        }
        return result;
    };
    node.width = function () {
        if (arguments.length == 0) return node.box().width;
        var value = arguments[0];
        if (!isString(value) || value.search(/[^.0-9]/) <= 0) {
            value = value + 'px';
        }
        node.style('width', value);
        return node;
    };
    node.height = function () {
        if (arguments.length == 0) return node.box().height;
        var value = arguments[0];
        if (!isString(value) || value.search(/[^.0-9]/) <= 0) {
            value = value + 'px';
        }
        node.style('height', value);
        return node;
    };
    node.child = function (index) {
        return wrap(element.childNodes[index]);
    };
    node.maximize = function () {
        node.shouldBeMaximized = true;
        return node;
    };
    node.clone = function () {
        return wrap(element.cloneNode(true));
    };

    return node;
};

var onReady = function (callback) {
    if (stateIsReady(document.readyState) && document.body) {
        callback();
    } else {
        document.addEventListener('DOMContentLoaded', callback, false);
    }
};

var stateIsReady = function (state) {
    return state == 'complete' || state == 'loaded' || state == 'interactive';
};

var group = function () {
    var elements = [];
    for (var i = 0; i < arguments.length; i++) {
        elements.push(arguments[i]);
    }
    var group = {};
    group.forEach = function (processor) {
        for (var i = 0; i < elements.length; i++) {
            processor(elements[i], i);
        }
    };
    group.size = function () {
        return elements.length;
    };
    group.animate = function (targets, options) {
        options = options || {};
        var optionsOfLast = Commons.clone(options);
        delete options.onDone;
        delete options.onComplete;
        delete options.onCanceled;
        delete options.onTick;
        var stagger = (options.stagger || 0);
        var delay = (options.delay || 0);
        var maxIndex = group.size() - 1;
        group.forEach(function (node, index) {
            var myOptions;
            if (index < maxIndex) {
                myOptions = Commons.clone(options);
            } else {
                myOptions = optionsOfLast;
            }
            myOptions.delay = delay;
            delay += stagger;
            node.animate.call(node, targets, myOptions);
        });
    };
    return group;
};


var transformToObject = function (value) {
    var result = {};
    if (!value || value.length == 0) return result;
    var split = value.split(' ');
    for (var i = 0; i < split.length; i++) {
        var current = split[i];
        var opening = current.indexOf('(');
        var key = (opening > 0 ? current.substr(0, opening) : current);
        result[key] = (opening > 0 ? current.substr(opening + 1, current.length - opening - 2) : null);
    }
    return result;
};

var transformToString = function (transform) {
    var result = "";
    for (var key in transform) {
        var value = transform[key];
        result += key + (isDefined(value) ? '(' + value + ')' : '') + ' ';
    }
    return result.length > 0 ? result.substr(0, result.length - 1) : result;
};


var exported = {
    text: text,
    node: node,
    wrap: wrap,
    getNode: getNode,
    group: group,
    onReady: onReady
};

onReady(function () {
    exported.body = wrap(document.body);
    exported.document = wrap(document);
    exported.window = wrap(window);
});

module.exports = exported;