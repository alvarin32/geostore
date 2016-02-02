var Log = require('./log');

var createRequest = function (method, url) {
    var data,
        onSuccess = Log.info,
        onFailure = Log.error,
        onUploadProgress,
        onDownloadProgress;

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    var request = {};
    request.attach = function ($data, contentType) {
        if (contentType != undefined) {
            data = $data;
            if (contentType) xhr.setRequestHeader('Content-Type', contentType);
        } else {
            data = JSON.stringify($data);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF8');
        }
        return request;
    };
    request.header = function (header, value) {
        xhr.setRequestHeader(header, value);
        return request;
    };
    request.onSuccess = function (handler) {
        onSuccess = handler;
        return request;
    };
    request.onFailure = function (handler) {
        onFailure = handler;
        return request;
    };
    request.onDownloadProgress = function (handler) {
        onDownloadProgress = handler;
        return request;
    };
    request.onUploadProgress = function (handler) {
        onUploadProgress = handler;
        return request;
    };
    request.send = function () {
        if (onUploadProgress) listenForUpload(xhr, onUploadProgress);
        if (onDownloadProgress) listenForDownload(xhr, onDownloadProgress);
        xhr.send(data);
        return request;
    };
    request.cancel = function () {
        xhr.abort();
        return request;
    };

    xhr.onreadystatechange = function () {
        var state = xhr.readyState;
        if (state == 4) {
            if (xhr.status == 200) {
                if (onSuccess) onSuccess(xhr.responseText, xhr);
            } else {
                if (onFailure) onFailure(xhr.statusText, xhr);
            }
        }
    };

    return request;
};

var listenForUpload = function (request, handler) {
    request.upload.addEventListener('progress', function (event) {
        //noinspection JSUnresolvedVariable
        var progress = (event.lengthComputable)
            ? event.loaded / event.total
            : undefined;
        handler(progress);
    }, false);
};

var listenForDownload = function (request, handler) {
    request.addEventListener('progress', function (event) {
        //noinspection JSUnresolvedVariable
        var progress = (event.lengthComputable)
            ? event.loaded / event.total
            : undefined;
        handler(progress);
    }, false);
};


module.exports = {
    request: createRequest,
    post: function (url) {
        return createRequest('POST', url);
    },
    get: function (url) {
        return createRequest('GET', url);
    }
};
