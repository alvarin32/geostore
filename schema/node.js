var Schema = require('elastic/schema');
var Geo = require('geometry');

var type = {
    id: 'node',
    create: function (id, location) {
        return {type: type, id: id, location: location}
    },
    write: function (node) {
        var body = Schema.write(node);
        var location = body.location;
        if (location && !Array.isArray(location)) body.location = location.asArray();
        return body;
    },
    read: function (body) {
        var node = Schema.read(body);
        if (node.location) node.location = Geo.Point.fromArray(node.location);
        return node;
    },
    schema: {
        name: Schema.fuzzy,
        location: Schema.geoPoint,
        tags: Schema.nested()
    }
};


exports.type = type;