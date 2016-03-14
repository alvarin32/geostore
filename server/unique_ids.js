var Commons = require('commons');

var ids = {};

var generate = function (length) {
    var id = Commons.randomId(length || 20);
    if (ids[id]) return generate();
    ids[id] = new Date();
    return id;
};

var free = function (id) {
    delete ids[id];
};

module.exports = {
    generate: generate,
    free: free
};


