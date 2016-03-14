var Mmm = require('mmmagic');
var Fs = require('fs');

var Magic = new Mmm.Magic(Mmm.MAGIC_MIME_TYPE);

exports.handler = function (request, response, next) {

    response.sendFile = function (filePath, options) {
        sendFile(filePath, response, options || {});
    };

    response.sendJson = function (json) {
        sendJson(json, response);
    };

    next();
};


var sendFile = function (filePath, response, options) {
    var onMimeTypeReady = function (mimeType) {
        response.setHeader('content-type', mimeType);
        if (options.asAttachment) {
            response.setHeader(
                'content-disposition',
                'attachment; filename=' + options.asAttachment);
        }
        Fs.createReadStream(filePath).pipe(response);
    };

    if (options.mimeType) return onMimeTypeReady(options.mimeType);
    Magic.detectFile(filePath, function (error, mimeType) {
        if (error) return onMimeTypeReady('application/octet-stream');
        return onMimeTypeReady(mimeType);
    });
};


var sendJson = function (json, response) {
    response.setHeader('content-type', 'application/json');
    response.write(JSON.stringify(json));
    response.end();
};