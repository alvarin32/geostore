var Path = require('path');
var Fs = require('fs');
var UniqueIds = require('./unique_ids');
var Log = require('./log');
var Osm = require('./osm');
var Zlib = require('zlib');
var GeoTools = require('geometry/tools');


var writeStream, id, route;

exports.start = function (application, configuration, global) {

    var database = application.database;
    configuration = configuration.restore;
    var filePath = Path.join(configuration.folder, 'input');


    application.ether.onCall('/api/restore/initiate', function (parameter, client, onDone) {
        if (global.dbIsBusy) return onDone(['database', 'busy']);
        global.dbIsBusy = true;

        deleteFileIfExists(filePath, function (error) {
            if (error) return onDone(['restore', 'couldNotPrepareUpload']);
            writeStream = Fs.createWriteStream(filePath);
            id = UniqueIds.generate(20);
            route = '/api/restore/' + id;
            application.router.route(route, function (request, response, next) {
                request.on('error', writeStream.end.bind(writeStream));
                request.on('data', writeStream.write.bind(writeStream));
                request.on('end', response.end.bind(response));
            });
            onDone(undefined, route);
        });
    });

    application.ether.onCall('/api/restore/commit', function (parameter, client, onDone) {
        application.router.unroute(route);
        UniqueIds.free(id);
        route = null;
        id = null;

        var _onDone = onDone;
        onDone = function (error) {
            global.dbIsBusy = false;
            deleteFileIfExists(filePath, function () {
                Log.error(error) && _onDone(error);
            });
        };

        writeStream.on('finish', importFile.bind(null, filePath, client, onDone));
        writeStream.end();
    });


    var importFile = function (filePath, client, onDone) {

        var onProgress = function (progress) {
            client.notify('restore/progress', progress);
        };

        var readPbfFile = function (filePath, onProgress) {
            Osm.parseBounds(filePath, function (error, bounds) {
                if (error) return onDone(['restore', 'couldNotParseBounds']);
                client.call('defineExcerpt', bounds.toGeoJson(), function (error, excerpt) {
                    if (error) return Log.error(error) && onDone(['restore', 'couldNotDefineExcerpt']);
                    excerpt = GeoTools.fromGeoJson(excerpt);
                    Osm.createParser(database, excerpt).parse(filePath, onProgress, onDone);
                });
            });
        };

        var readZipFile = function (filePath, onProgress) {
            var fileStream = Fs.createReadStream(filePath);
            var zipStream = Zlib.createGunzip();
            var stream = fileStream.pipe(zipStream);
            database.readBackup(stream, onProgress, onDone);
        };

        onProgress(0.033);
        database.reset(function (error) {
            if (error) return onDone(['restore', 'couldNotResetDatabase']);
            onProgress(0.066);
            getFileType(filePath, function (error, mimeType) {
                if (error) return onDone(['restore', 'couldNotDetectFileType']);
                onProgress(0.1);
                var _onProgress = onProgress;
                onProgress = function (progress) {
                    _onProgress(0.1 + 0.9 * progress);
                };

                if (mimeType == 'pbf') {
                    readPbfFile(filePath, onProgress);
                } else {
                    readZipFile(filePath, onProgress);
                }
            });
        });
    };

};


var deleteFileIfExists = function (file, onDone) {
    Fs.access(file, Fs.F_OK, function (doesNotExist) {
        if (doesNotExist) return onDone();
        Fs.unlink(file, onDone);
    });
};

var getFileType = function (file, onDone) {
    Fs.open(file, 'r', function (error, descriptor) {
        var buffer = new Buffer(4);
        Fs.read(descriptor, buffer, 0, 4, 0, function (error, bytesRead, buffer) {
            if (error) return onDone(error);
            Fs.close(descriptor, function (error) {
                if (error) return onDone(error);
                var fileType = buffer.readInt16BE(0) == 8075 ? 'gz' : 'pbf';
                onDone(undefined, fileType);
            });
        });
    });
};