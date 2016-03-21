var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'way',
    create: function (id) {
        return {type: type, id: id};
    },
    write: function (way) {
        var body = Schema.write(way);
        if (body.geometry) {
            body.bounds = body.geometry.computeBoundingBox().toGeoJson();
            body.geometry = body.geometry.toGeoJson();
        }
        return body;
    },
    read: function (body) {
        var way = Schema.read(body);
        if (way.bounds) delete way.bounds;
        if (way.geometry) way.geometry = GeoTools.fromGeoJson(way.geometry);
        return way;
    },
    schema: {
        name: Schema.fuzzy,
        bounds: Schema.geoShape,
        geometry: Schema.nested({}, false),
        tags: Schema.nested(),
        nodeIds: Schema.reference
    }
};

exports.type = type;