var Zlib = require('zlib');
var Path = require('path');
var UniqueIds = require('./unique_ids');
var Log = require('./log');
var Fs = require('fs');
var Observable = require('commons/observable');

var EXPIRY = 1000 * 60 * 60 * 24;

exports.start = function (application, configuration, global) {

    var url = configuration.url;
    configuration = configuration.backups;

    application.ether.onCall('/api/backup', function (parameter, client, onDone) {

        if (global.dbIsBusy) return onDone(['database', 'busy']);
        global.dbIsBusy = true;

        var id = UniqueIds.generate(4);
        var fileName = dateString() + '_' + id + '.zip';
        var filePath = Path.join(configuration.folder, fileName);

        var onProgress = function (progress) {
            client.notify('backup/progress', progress);
        };

        dumpDatabase(filePath, onProgress, function (error) {
            global.dbIsBusy = false;
            if (error) return Log.error(error) && onDone(['backup', 'couldNotDumpDatabase']);
            createDownload(filePath, function (error, download) {
                if (error) return onDone(['backup', 'downloadCouldNotBeInstantiated']);
                download.on('expire', function () {
                    UniqueIds.free(id);
                    Fs.unlink(filePath, Log.error);
                });
                onDone(undefined, download.link);
            });
        });

    });

    var dumpDatabase = function (filePath, onProgress, onDone) {
        var fileStream = Fs.createWriteStream(filePath);
        var zipStream = Zlib.createGzip();
        zipStream.pipe(fileStream);
        zipStream.on('finish', onDone);

        var _onProgress = onProgress;
        onProgress = function (progress) {
            _onProgress(progress * 0.95);
        };

        application.database.writeBackup(zipStream, onProgress, function (error) {
            if (error) return onDone(error);
            zipStream.end();
        });
    };

    var createDownload = function (filePath, onDone) {
        var download = Observable.create();
        var handler = function (request, response) {
            response.sendFile(filePath, {
                mimeType: 'application/gzip',
                asAttachment: Path.basename(filePath)
            });
        };
        var route = '/download/' + Path.basename(filePath);
        application.router.route(route, handler);
        setTimeout(function () {
            application.router.unroute(route);
            download.emit('expire');
        }, EXPIRY);
        download.link = url + route;
        onDone(undefined, download);
    };

    var dateString = function () {
        var now = new Date();
        return now.getFullYear() +
            fill((now.getMonth() + 1).toString(), 2) +
            fill((now.getDate() + 1).toString(), 2);
    };

    var fill = function (string, size) {
        while (string.length < size) {
            string = '0' + string;
        }
        return string;
    };

};