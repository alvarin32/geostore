var Schema = require('elastic/schema');
var GeoTools = require('geometry/tools');

var type = {
    id: 'scenario',
    create: function (creator) {
        var now = (new Date()).getTime();
        return {type: type, created: now, creator: creator};
    },
    write: function (scenario) {
        var body = Schema.write(scenario);
        if (body.bounds) body.bounds = body.bounds.toGeoJson();
        return body;
    },
    read: function (body) {
        var scenario = Schema.read(body);
        if (scenario.bounds) scenario.bounds = GeoTools.fromGeoJson(scenario.bounds);
        return scenario;
    },
    schema: {
        name: Schema.fuzzy,
        created: Schema.long,
        creator: Schema.notAnalyzed(Schema.string),
        bounds: Schema.geoShape
    }
};

exports.type = type;