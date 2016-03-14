module.exports = function(code, delay) {

    if (!code) throw 'invalid timer!';
    delay = delay || 0;

    var timeout;
    var timer = {};

    timer.stop = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        return timer
    };

    timer.start = function() {
        timer.stop();
        timeout = setTimeout(function() {
            timeout = undefined;
            code && code();
        }, delay);
        return timer;
    };

    timer.restart = timer.start;

    return timer;
};