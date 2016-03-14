var Gui = require('./gui');
var F = require('client/fiat');
var I18n = require('client/i18n');
var Observable = require('commons/observable');
var Ajax = require('client/ajax');
var Input = require('./input');

var GeoTools = require('geometry/tools');
var Geo = require('geometry');

var Map = require('map');
var Geometries = require('map/geometries');
var Constructor = require('map/constructor');
var Tiles = require('map/tiles');

module.exports = function (application, onDone) {

    var start = function () {
        //var bounds = GeoTools.fromGeoJson(JSON.parse('{"type":"Envelope","coordinates":[[10.3765598,49.3569601],[13.0013239,50.533917]]}'));
        //askForExcerpt(bounds, onDone);

        warnUser(function (goOn) {
            if (!goOn) return onDone();
            uploadAndAwaitProcessing(function (error) {
                if (error) return showError(error);
                showSuccess(onDone);
            });
        });
    };

    var showError = function (error) {
        error = I18n.get(error);
        var container = Gui.createContainer();
        var message = F.node('div').style({color: colors.error, fontSize: cm(0.4)}).text(error);
        var button = Gui.createButton(['restore', 'buttonError']);
        button.on('click', container.hide.bind(null, onDone));
        container.append(message, button).show();
    };

    var showSuccess = function () {
        var text = I18n.get(['restore', 'success']);
        var container = Gui.createContainer();
        var message = F.node('div').style({color: colors.success, fontSize: cm(0.4)}).text(text);
        var button = Gui.createButton(['restore', 'buttonSuccess']);
        button.on('click', container.hide.bind(null, onDone));
        container.append(message, button).show();
    };

    var warnUser = function (onDone) {
        var container = Gui.createContainer();
        var label = F.node('div').style({fontWeight: 'bold', fontSize: cm(0.4)}).text(I18n.get(['restore', 'warning']));
        var goOn = Gui.createButton(['restore', 'okLetsGo'])
            .on('click', function () {
                container.hide(onDone.bind(undefined, true));
                return false;
            });
        var cancel = Gui.createButton(['restore', 'okCancel'])
            .on('click', function () {
                container.hide(onDone.bind(undefined, false));
                return false;
            });
        container.append(label, goOn, cancel).show();
    };

    var uploadAndAwaitProcessing = function (onDone) {
        var container = Gui.createContainer();
        var dropZone = createDropZone();
        dropZone.on('files', function (files) {
            if (!files || !files.length) return;
            var file = files[0];
            var fileWidget = createFileWidget(file).appendTo(dropZone);
            container.append(fileWidget);
            dropZone.hide(function () {
                fileWidget.showLabelAndBar(function () {
                    var _onDone = onDone;
                    onDone = function (error) {
                        container.hide(function () {
                            _onDone(error);
                        });
                    };
                    doUploadAndAwait(file, fileWidget.onProgress, onDone);
                });
            });
        });
        container.append(dropZone).show();
    };

    var doUploadAndAwait = function (file, onProgress, onDone) {

        var ether = application.ether;

        ether.register('defineExcerpt', function (bounds, onDone) {
            bounds = GeoTools.fromGeoJson(bounds);
            askForExcerpt(bounds, function (excerpt) {
                console.log(excerpt.toGeoJson());
                onDone(undefined, excerpt.toGeoJson());
            });
        }, true);

        ether.register('restore/progress', onProgress);
        var _onDone = onDone;
        onDone = function () {
            ether.deregister('restore/progress', onProgress);
            _onDone.apply(this, arguments);
        };

        ether.call('/api/restore/initiate', function (error, route) {
            if (error) return onDone(error);

            var onUploadProgress = function (progress) {
                onProgress(0.1 * progress);
            };

            sendFile(file, route, onUploadProgress, function (error) {
                if (error) return onDone(error);
                ether.call('/api/restore/commit', onDone);
            });
        });

    };

    var sendFile = function (file, route, onProgress, onDone) {
        var request, uploaded = 0, fileSize = file.size;
        var MAX_CHUNK_SIZE = 1024 * 1024 * 32;
        (function uploadNextChunk(position) {
            position = position || 0;
            if (position == fileSize) return onDone();
            var chunkSize = Math.min(fileSize - position, MAX_CHUNK_SIZE);
            var slice = (chunkSize == fileSize) ? file : file.slice(position, position + chunkSize);
            request = Ajax.post(route)
                .attach(slice, false)
                .onSuccess(function () {
                    request = null;
                    uploaded += chunkSize;
                    onProgress(uploaded / fileSize);
                    uploadNextChunk(position + chunkSize);
                })
                .onFailure(function () {
                    request = null;
                    onDone(['restore', 'couldNotUploadFile']);
                })
                .onUploadProgress(function (progress) {
                    var total = (uploaded + chunkSize * progress) / fileSize;
                    onProgress(total);
                })
                .send();
        })();
    };

    var createFileWidget = function (file) {
        var iconSize = cm(1.5);
        var container = F.node('div').style(center).style({width: cm(8), height: iconSize, lineHeight: 0});
        var icon = Gui.createIcon('/images/file.svg').style({width: iconSize, height: iconSize});
        var label = createFileLabel(file).style({opacity: 0, height: 0});
        var progressBar = Gui.createProgressBar().style({opacity: 0, height: 0});
        container.showLabelAndBar = function (onDone) {
            label.animate({height: cm(1)}, {onDone: label.animate.bind(null, {opacity: 1})});
            progressBar.animate({height: cm(0.8)}, {onDone: progressBar.animate.bind(null, {opacity: 1})});
            container.animate({height: cm(2.5)}, {onDone: onDone});
        };
        container.onProgress = progressBar.onProgress;
        return container.append(icon, label, progressBar);

    };

    var createFileLabel = function (file) {
        return F.node('div')
            .style({whiteSpace: 'nowrap', fontSize: cm(0.3), lineHeight: cm(0.9)})
            .text(file.name);
    };


    var createDropZone = function () {

        var dropZone = F.node('div')
            .style({
                border: colors.dark + ' dashed ' + cm(0.05),
                width: cm(4), height: cm(4),
                position: 'relative', cursor: 'pointer',
                display: 'inline-block'
            });

        var fill = {width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, cursor: 'pointer'};

        var form = F.node('form')
            .attr({method: 'post', enctype: 'multipart/form-data'})
            .style(fill);
        var fileInput = F.node('input')
            .attr({type: 'file', id: 'DzInput', multiple: false})
            .style(fill)
            .style({visibility: 'hidden'});
        var label = F.node('label')
            .attr('for', 'DzInput')
            .style(fill);

        var message = F.node('div')
            .style(center)
            .style({height: cm(2), lineHeight: cm(0.3), fontSize: cm(0.3), color: colors.between})
            .text(I18n.get(['restore', 'dropZone']));

        dropZone.append(message, form.append(fileInput, label));

        var notify = function (fileList) {
            var fileArray = [];
            for (var i = 0; i < fileList.length; i++) fileArray.push(fileList[i]);
            dropZone.emit('files', fileArray);
        };

        fileInput.on('change', function () {
            var files = fileInput.raw().files;
            notify(files);
            return false;
        });

        dropZone.on('drop', function () {
            var files = event['dataTransfer']['files'];
            notify(files);
            return false;
        });

        dropZone.on('dragover', function (event) {
            event['dataTransfer']['dropEffect'] = 'copy';
            return false;
        });

        dropZone.hide = function (onDone) {
            message.remove();
            dropZone.animate({opacity: 0}, {onDone: onDone});
        };

        return Observable.wrap(dropZone);
    };


    var center = {
        left: 0, top: 0, bottom: 0, right: 0,
        position: 'absolute', margin: 'auto'
    };

    start();

};

var askForExcerpt = function (bounds, onDone) {

    var blend = F.node('div').style({
        position: 'fixed', height: '100%', width: '100%',
        backgroundColor: colors.dark,
        left: 0, top: 0, zIndex: 10, opacity: 0
    });

    var show = function (onDone) {
        blend.animate({opacity: 0.6});
        map.container.animate({opacity: 1}, {delay: 300, onDone: onDone});
    };

    var hide = function (onDone) {
        map.container.animate({opacity: 0});
        blend.animate({opacity: 0}, {delay: 300, onDone: onDone});
    };

    var map = Map.create();
    var tiles = Tiles.layer(map, Tiles.providers.MAPQUEST);
    var mask = createMask(map, bounds);
    var constructor = Constructor.layer(map);

    map.container.style({
        position: 'fixed', width: '100%', height: '100%',
        maxWidth: cm(12), maxHeight: cm(12),
        margin: 'auto', left: 0, top: 0, right: 0, bottom: 0,
        zIndex: 10, opacity: 0, borderRadius: cm(0.25), overflow: 'hidden'
    });
    map.container.onAttached(function () {
        map.goToGeo(bounds);
    });

    F.body.append(blend, map.container);
    show(function construct() {
        var cancelBox = constructor.box(function (box) {
            listener.stop();
            hide(function () {
                map.container.remove();
                blend.remove();
                onDone(box);
            });
        });

        var listener = Input.listenForKeys(function (keyEvent) {
            if (keyEvent.keyCode == 27) {
                cancelBox();
                listener.stop();
                construct();
                return false;
            }
        });
    });
};

var createMask = function (map, bounds) {
    var polygon = Geo.Polygon.create();
    var outer = Geo.Path.create()
        .moveTo(Geo.Point.create(-180, 90))
        .lineTo(Geo.Point.create(180, 90))
        .lineTo(Geo.Point.create(180, -90))
        .lineTo(Geo.Point.create(-180, -90))
        .close();

    var inner = Geo.Path.create()
        .moveTo(Geo.Point.create(bounds.getLeft(), bounds.getTop()))
        .lineTo(Geo.Point.create(bounds.getRight(), bounds.getTop()))
        .lineTo(Geo.Point.create(bounds.getRight(), bounds.getBottom()))
        .lineTo(Geo.Point.create(bounds.getLeft(), bounds.getBottom()))
        .close();

    polygon.addPath(outer).addPath(inner);
    polygon.style = {hideStroke: true, hideNodes: true};
    polygon.snapDistance = 0;
    polygon.onOver = function () {
        polygon.style.fillColor = colors.signal;
        return false;
    };
    polygon.onOut = function () {
        polygon.style.fillColor = colors.bright;
        return false;
    };
    return Geometries.layer(map).addGeo(polygon);
};