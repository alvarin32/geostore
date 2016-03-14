var Fs = require('fs');
var Path = require('path');
var Log = require('./log');
var Chokidar = require('chokidar');


module.exports = function (pathToLocales, defaultLocale) {

    var labelMap = {};

    (function initialize() {

        Fs.readdir(pathToLocales, function (error, files) {
            if (error) return Log.error(error);
            files.forEach(function (file) {
                file = pathToLocales + Path.sep + file;
                readAndWatch(file);
            });
        });

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
                if (error) return Log.error(error);
                Fs.stat(file, function (error, statistics) {
                    if (error) return Log.error(error);
                    try {
                        var labels = JSON.parse(data.toString());
                    } catch (error) {
                        Log.warn('found invalid json...will ignore update!');
                        return;
                    }
                    labelMap[locale] = {
                        modified: new Date(statistics.mtime).getTime(),
                        labels: labels
                    };
                });
            });
        };

    })();


    var search = function (labels, path) {
        var current = labels;
        for (var i = 0; i < path.length; i++) {
            var subKey = path[i];
            if (!isObject(current) || !(subKey in current)) return;
            current = current[subKey];
        }
        if (isString(current)) return current;
        return null;
    };

    var get = function (locale, path) {
        if (!(locale in labelMap)) locale = defaultLocale;
        if (!(locale in labelMap)) return join(path);
        var labels = labelMap[locale].labels;
        var result = search(labels, path);
        result = result || join(path);
        return result;
    };

    var getLabels = function (locale) {
        if (!(locale in labelMap)) locale = defaultLocale;
        return labelMap[locale];
    }

    return {
        get: get,
        getLabels: getLabels
    };

};


var join = function (path) {
    return Array.prototype.join.call(path, '.');
};

var isString = function (value) {
    return (typeof value == 'string' || value instanceof String);
};

var isObject = function (value) {
    return (typeof value == "object") && (value !== null);
};
