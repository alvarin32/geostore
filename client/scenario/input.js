var F = require('client/fiat');
var Gui = require('client/gui');
var Keys = require('../keys');
var Observable = require('commons/observable');
var I18n = require('client/i18n');

module.exports = function (stage) {

    var _ = {};

    _.askForString = function (options) {
        var input = F.node('input')
            .attr({type: 'text'})
            .style({
                width: '70%', textAlign: 'center',
                height: cm(0.8), borderRadius: cm(0.06),
                fontSize: cm(0.4), margin: cm(0.5)
            });
        options.preset && input.value(options.preset);
        input.onAttached(input.focus);

        var question = askFor(input);
        question.on('confirmed', function () {
            options.onConfirmed(input.value());
        });
    };

    _.askForFile = function (options) {
        var widget = F.node('div').style({width: '70%', height: cm(3)});
        var dropZone = createDropZone().appendTo(widget);
        var uploadStatus = Observable.create();
        dropZone.on('files', function (files) {
            var file = files[0];
            doUpload(file, options.ether, uploadStatus);
        });


        var onFileUploaded = function (uploadId) {

        };


        var question = askFor(widget);
        question.on('confirmed', function () {
            //TODO
        });
    };

    var buttonStyle = {width: '100%', height: '100%'};
    var askFor = function (widget) {

        var question = Observable.create();

        var stop = function (onDone) {
            stage.header.left.pop();
            stage.header.right.pop();
            stage.screen.pop();
            keyListener.stop();
            onDone && onDone();
        };

        var cancel = function () {
            stop();
            question.emit('canceled');
            return false;
        };

        var confirm = function () {
            stop();
            question.emit('confirmed');
            return false;
        };

        var confirmButton = Gui.createIcon('/images/confirm.svg', {color: colors.darker}).style(buttonStyle);
        var cancelButton = Gui.createIcon('/images/cancel.svg', {color: colors.darker}).style(buttonStyle);

        confirmButton.on('click', confirm);
        cancelButton.on('click', cancel);
        var keyListener = Keys.listen(function (event) {
            if (event.keyCode == 27) return cancel();
            if (event.keyCode == 13) return confirm();
        });
        question.on('cancel', cancel);
        question.on('confirm', confirm);

        stage.header.left.push(cancelButton);
        stage.header.right.push(confirmButton);
        stage.screen.push(widget);
        return question;
    };


    return _;
};


var createDropZone = function () {

    var dropZone = F.node('div')
        .style({
            border: colors.dark + ' dashed ' + cm(0.05),
            width: '100%', height: '100%',
            position: 'relative', cursor: 'pointer'
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
        .style({
            padding: cm(0.25),
            height: cm(2), lineHeight: cm(0.3), fontSize: cm(0.3), color: colors.between,
            left: 0, top: 0, right: 0, bottom: 0, margin: 'auto', position: 'absolute'
        })
        .text(I18n.get(['input', 'dropZone']));

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