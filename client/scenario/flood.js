var Gui = require('client/gui');

module.exports = function (context) {

    var iconColor = '#4792FC';
    var iconStyle = {width: cm(1), height: cm(1)};
    var addUploadTool = function () {
        var icon = Gui.createIcon('/images/flood/upload.svg', {color: iconColor}).style(iconStyle);
        context.stage.menu.append(icon);
        icon.on('click', function () {
            context.stage.menu.hide();
            context.input.askForFile(function (uploadId) {
                context.application.ether.notify('scenario/setFlood', uploadId);
            });
            return false;
        })
    };

    var addTimeTool = function () {

    };

    var start = function () {
        addUploadTool();
        addTimeTool();
    };

    var stop = function () {

    };

    return {
        start: start,
        stop: stop
    }

};