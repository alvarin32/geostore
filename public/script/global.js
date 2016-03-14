function cm(value, shouldBeEven) {
    var px = Math.round(cmToPx(value));
    var isEven = ((px % 2) == 0);
    if (isEven != shouldBeEven) px++;
    return px + "px";
}

function cmToPx(cms) {
    return Math.round(cms * 50);
}

var isArray = Array.isArray || function (object) {
        return object instanceof Array;
    };

var isObject = isObject || function (value) {
        return (typeof value == "object") && (value !== null);
    };

var isDefined = function (value) {
    return (typeof value) != 'undefined';
};

var isString = isString || function (value) {
        return (typeof value == 'string' || value instanceof String);
    };

var isFunction = isFunction || function (value) {
        return (typeof value == 'function');
    };

var isCssNull = function (value) {
    return value === ''
        || value == 'none'
        || value == 'inherited'
        || value == 'auto';
};

var window = window || {};
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame;


var colors = {
    darker: '#303030',
    dark: '#3f3f3f',
    between: '#909090',
    bright: '#F3F3F3',
    brighter: '#FBFBFB',
    signal: '#ff972a',
    error: '#be615d',
    success: '#3c876b'
};

var fonts = {
    mono: '"Lucida Console", Monaco, monospace',
    fine: '\'Helvetica Neue\', Roboto, sans-serif'
};