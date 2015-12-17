var Commons = require('./commons');

var rgbToHsl = function (rgb) {
    var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return {h: h, s: s, l: l};
};

var hueToRgb = function (p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};

var hslToRgb = function (hsl) {
    var h = hsl.h, s = hsl.s, l = hsl.l;
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }
    return rgb(Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255));
};

var rgbToHex = function (rgb) {
    return '#'
        + decToHex(rgb.r)
        + decToHex(rgb.g)
        + decToHex(rgb.b);
};

var rgbToInt = function (rgb) {
    var result = rgb.r;
    result = (result << 8) | rgb.g;
    result = (result << 8) | rgb.b;
    return result;
};

var intToRgb = function (int) {
    var mask = 0xFF;
    var red = (int >> 16) & mask;
    var green = (int << 8) & mask;
    var blue = int & mask;
    return rgb(red, green, blue);
};

var random = function () {
    var red = Math.floor(Math.random() * 256);
    var blue = Math.floor(Math.random() * 256);
    var green = Math.floor(Math.random() * 256);
    return rgbToHex(rgb(red, blue, green));
};

var decToHex = function (value) {
    var hex = Math.round(value).toString(16);
    if (hex.length < 2) hex = '0' + hex;
    return hex;
};

var hexToRgb = function (hex) {
    if (hex[0] == '#') hex = hex.substr(1);
    var red = parseInt(hex.substr(0, 2), 16);
    var green = parseInt(hex.substr(2, 2), 16);
    var blue = parseInt(hex.substr(4, 2), 16);
    return rgb(red, green, blue);
};

var rgb = function (red, green, blue, alpha) {
    alpha = (alpha == undefined) ? 1 : alpha;
    return {
        r: red, g: green, b: blue,
        a: alpha,
        toString: function () {
            return 'rgba('
                + red + ', '
                + green + ', '
                + blue + ', '
                + alpha + ')';
        }
    };
};

var lighten = function (hexColor, value) {
    var rgb = hexToRgb(hexColor);
    var hsl = rgbToHsl(rgb);
    hsl.l *= value;
    hsl.l = Math.max(0, Math.min(hsl.l, 1));
    rgb = hslToRgb(hsl);
    return rgbToHex(rgb);
};


var parseRgb = function (value, defaultValue) {
    defaultValue = defaultValue || rgb(0, 0, 0);
    if (!value || value.length == 0) return defaultValue;
    if (value[0] == '#') {
        return hexToRgb(value);
    }
    var numbers;
    if (Commons.startsWith(value, 'rgba')) {
        numbers = extractNumbers(value);
        return rgb(numbers[0], numbers[1], numbers[2], numbers[3]);
    }
    if (Commons.startsWith(value, 'rgb')) {
        numbers = extractNumbers(value);
        return rgb(numbers[0], numbers[1], numbers[2]);
    }
    return defaultValue;
};

var extractNumbers = function (value) {
    var numbers = [];
    var current = '';
    for (var i = 0; i < value.length; i++) {
        var character = value[i];
        if ((character >= '0' && character <= '9') ||
            (current.length == 0 && character === '-') || character === '.') {
            current += character;
        } else if (current.length > 0) {
            parseAndPushOnSuccess(current, numbers);
            current = '';
        }
    }
    if (current.length > 0) parseAndPushOnSuccess(current, numbers);
    return numbers;
};

var parseAndPushOnSuccess = function (value, array) {
    try {
        array.push(parseFloat(value));
    } catch (exception) {
        console.log('warning: unexpected float format \'' + value + '\'');
    }
};


module.exports = {
    rgb: rgb,
    rgbToInt: rgbToInt,
    rgbToHex: rgbToHex,
    rgbToHsl: rgbToHsl,
    hslToRgb: hslToRgb,
    random: random,
    lighten: lighten,
    intToRgb: intToRgb,
    hexToRgb: hexToRgb,
    parseRgb: parseRgb,
    //
    darker: '#030303',
    dark: '#303030',
    bright: '#f3f3f3',
    signal: '#ffaa55'
};