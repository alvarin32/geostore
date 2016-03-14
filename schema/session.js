var Schema = require('elastic/schema');


var type = {
    id: 'session',
    create: function () {
        var session = {type: type};
        session.lastAccess = (new Date()).getTime();
        return session;
    },
    write: Schema.write,
    read: Schema.read,
    schema: {
        lastAccess: Schema.long,
        userId: Schema.reference
    }
};

exports.type = type;



