var error = function (message) {
    (message != undefined) && console.error((new Date()) + ': ' + JSON.stringify(message));
    return true;
};

var info = function (message) {
    (message != undefined) && console.info((new Date()) + ': ' + message);
    return true;
};

var warning = function (message) {
    (message != undefined) && console.warn((new Date()) + ': ' + message);
    return true;
};

module.exports = {
    error: error,
    info: info,
    warning: warning
};