var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'relation',
    create: function (id) {
        return {type: type, id: id};
    },
    write: function (way) {
        var body = Schema.write(way);
        if (body.location) body.location = body.location.toGeoJson();
        return body;
    },
    read: Schema.read,
    schema: {
        name: Schema.fuzzy,
        tags: Schema.nested(),
        members: Schema.nested({
            type: Schema.string,
            ref: Schema.reference,
            role: Schema.string
        })
    }
};

exports.type = type;