var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'node',
    create: function (id, location) {
        return {type: type, id: id, location: location}
    },
    write: function (node) {
        var body = Schema.write(node);
        if (body.location) body.location = body.location.toGeoJson();
        return body;
    },
    read: function (body) {
        var node = Schema.read(body);
        if (node.location) node.location = GeoTools.fromGeoJson(node.location);
        return node;
    },
    schema: {
        name: Schema.fuzzy,
        location: Schema.geo
    }
};


exports.type = type;