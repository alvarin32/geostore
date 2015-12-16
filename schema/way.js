var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'way',
    create: function (id) {
        return {type: type, id: id};
    },
    write: function (way) {
        var body = Schema.write(way);
        if (body.location) body.location = body.location.toGeoJson();
        return body;
    },
    read: function (body) {
        var way = Schema.read(body);
        if (way.location) way.location = GeoTools.fromGeoJson(way.location);
        return way;
    },
    schema: {
        name: Schema.fuzzy,
        location: Schema.geo
    }
};

exports.type = type;