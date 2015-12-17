module.exports = {
    error: function (error) {
        if (error) return console.error(error);
    },
    info: function (info) {
        if (info) return console.log(info);
    },
    warn: function (warning) {
        if (warning) return console.warn(warning);
    }
};