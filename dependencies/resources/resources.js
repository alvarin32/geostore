var Uglify = require('uglify-js');
var Browserify = require('browserify');
var Watchify = require('watchify');
var fs = require('fs');
var Path = require('path');


module.exports = function (sourceFile, targetFile) {

    var targetFolder = Path.dirname(targetFile);

    var watch = null;
    var updateIsRunning = false;
    var queued = false;

    var startWatch = function () {
        var bundle = Browserify(sourceFile, Watchify.args);
        watch = Watchify(bundle);
        watch.on('update', update);
        update();
    };

    var update = function () {
        if (updateIsRunning) return (queued = true);
        updateIsRunning = true;
        rebundle(function (error) {
            if (error) console.error(error);
            updateIsRunning = false;
            if (queued) {
                queued = false;
                process.nextTick(update);
            }
        });
    };

    var rebundle = function (onDone) {
        console.log('update script...');
        watch.bundle(function (error, data) {
            if (error) return onDone(error);
            writeToFile(data, targetFile, function (error) {
                if (error) return onDone(error);
                console.log('done.');
                onDone(); //minify(targetFile, onDone); FIXME
            });
        });
    };

    var minify = function (path, onDone) {
        var scriptName = 'script_min.js';
        var mapName = scriptName + '.map';

        console.log('minify script...');
        var minified = Uglify.minify(path, {
            outSourceMap: mapName
        });
        console.log('done. Writing result to disk...');
        writeToFile(minified.code, Path.join(targetFolder, scriptName), function (error) {
            if (error) return onDone(error);
            writeToFile(minified.map, Path.join(targetFolder, mapName), function (error) {
                if (error) return onDone(error);
                console.log('done.');
                onDone();
            });
        });
    };

    var writeToFile = function (data, path, onDone) {
        var stream = fs.createWriteStream(path);
        stream.write(data, function (error) {
            if (error) return onDone(error);
            stream.close();
            onDone();
        });
    };

    var stopWatch = function () {
        if (watch) watch.close();
    };

    return {
        start: startWatch,
        stop: stopWatch
    };
};
