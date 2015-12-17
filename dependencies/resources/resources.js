var Uglify = require('uglify-js');
var Browserify = require('browserify');
var Watchify = require('watchify');
var fs = require('fs');

var watch = null;
var updateIsRunning = false;
var queued = false;

var startWatch = function () {
    var bundle = Browserify('client.js', Watchify.args);
    watch = Watchify(bundle);
    watch.on('update', update);
    update();
};

var update = function () {
    if (updateIsRunning) {
        queued = true;
    } else {
        updateIsRunning = true;
        rebundle();
    }
};

var onDone = function () {
    updateIsRunning = false;
    if (queued) {
        queued = false;
        update();
    }
};

var onError = function (error) {
    onDone();
    return console.error(error);
};

var rebundle = function () {
    console.log('update script...');
    watch.bundle(function (error, data) {
        if (error) return onError(error);
        var path = 'public/script/script.js';
        writeToFile(data, path, function () {
            console.log('done.');
            onDone(); //minify(path); TODO: enable!
        });
    });
};

var minify = function (path) {
    var scriptName = 'script_min.js';
    var mapName = scriptName + '.map';
    var targetFolder = 'public/script/';

    console.log('minify script...');
    var minified = Uglify.minify(path, {
        outSourceMap: mapName
    });
    console.log('done. Writing result to disk...');
    writeToFile(minified.code, targetFolder + scriptName, function () {
        writeToFile(minified.map, targetFolder + mapName, function () {
            console.log('done.');
            onDone();
        });
    });
};

var writeToFile = function (data, path, onDone) {
    var stream = fs.createWriteStream(path);
    stream.write(data, function (error) {
        if (error) return onError(error);
        stream.close();
        onDone();
    });
};


var stopWatch = function () {
    if (watch) watch.close();
};

module.exports = {
    start: startWatch,
    stop: stopWatch
};