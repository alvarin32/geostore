var Schema = require('elastic/schema');

var defineTypes = function () {
    [
        require('./schema/node').type,
        require('./schema/way').type
    ].forEach(Schema.defineType);
};

defineTypes();