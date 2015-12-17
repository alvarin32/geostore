var Fs = require('fs');
var Path = require('path');
var Log = require('./log');
var Chokidar = require('chokidar');

var folder = 'public/locales';
var labelMap = {};
var defaultLocale = 'en';


Fs.readdir(folder, function (error, files) {
    if (error) return Log.error(error);
    files.forEach(function (file) {
        file = folder + '/' + file;
        readAndWatch(file);
    });
});

var getOrNull = function (labels, path) {
    var current = labels;
    for (var i = 0; i < path.length; i++) {
        var subKey = path[i];
        if (isObject(current) && (subKey in current)) {
            current = current[subKey];
        } else {
            return null;
        }
    }
    if (isString(current)) return current;
    return null;
};

var readAndWatch = function (file) {
    readFile(file);
    var watcher = Chokidar.watch(file, {persistent: true});
    watcher.on('change', function () {
        console.log('updated locale (' + file + ')');
        readFile(file);
    });
};

var readFile = function (file) {
    var locale = Path.basename(file, '.json');
    Fs.readFile(file, function (error, data) {
        labelMap[locale] = {
            version: new Date(Fs.statSync(file).mtime).getTime(),
            labels: JSON.parse(data.toString())
        };
    });
};


var isString = function (value) {
    return (typeof value == 'string' || value instanceof String);
};

var isObject = function (value) {
    return (typeof value == "object") && (value !== null);
};


exports.get = function () {
    var locale = arguments[0];
    var path = [];
    for (var i = 1; i < arguments.length; i++) path.push(arguments[i]);
    if (!(locale in labelMap)) locale = defaultLocale;
    var labels = labelMap[locale].labels;
    var result = getOrNull(labels, path);
    if (result == null) {
        result = Array.prototype.join.call(path, '.');
    }
    return result;
};

exports.service = function (app) {

    app.post('/api/i18n', function (request, response) {
        var locale = request.locale || defaultLocale;
        if (!(locale in labelMap)) locale = defaultLocale;
        var labels = labelMap[locale];
        var body = request.body;
        var clientsVersion = (body && body.version) || 0;
        if (clientsVersion < labels.version) {
            response.send(labels);
        } else {
            response.end();
        }
    });


};