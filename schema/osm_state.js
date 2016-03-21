var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'osm_state',
    create: function (bounds) {
        return {type: type, bounds: bounds, date: (new Date()).getTime()}
    },
    write: function (osmState) {
        var body = Schema.write(osmState);
        if (body.bounds) body.bounds = body.bounds.toGeoJson();
        return body;
    },
    read: function (body) {
        var osmState = Schema.read(body);
        if (osmState.bounds) osmState.bounds = GeoTools.fromGeoJson(osmState.bounds);
        return osmState;
    },
    schema: {
        bounds: Schema.geoShape,
        date: Schema.long
    }
};


exports.type = type;