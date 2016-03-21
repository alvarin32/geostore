var Query = require('elastic/query');
var Scenario = require('../schema/scenario');
var Schema = require('elastic/schema');
var OsmState = require('../schema/osm_state');

exports.start = function (application, configuration, global) {

    var database = application.database;

    application.ether.onCall('scenarios/list', function (parameter, client, onDone) {
        var scenarios = [];
        database.forEach(Query.type(Scenario.type), {
            onItem: function (scenario) {
                scenarios.push(scenario);
            },
            onDone: function (error) {
                if (error) return onDone(['scenarios', 'couldNotListScenarios']);
                database.search(Query.type(OsmState.type), function (error, result) {
                    if (error || !result.hits.length) return onDone(['scenarios', 'couldNotReadOsmStatus']);
                    result = {
                        scenarios: scenarios.map(Schema.toWire),
                        osmState: Schema.toWire(result.hits[0])
                    };
                    onDone(undefined, result);
                });
            }
        });
    });

    application.ether.onCall('scenarios/create', function (parameter, client, onDone) {
        var scenario = Scenario.type.create(client.user);
        database.put(scenario, function (error) {
            if (error) return onDone(['scenario', 'couldNotCreateScenario']);
            onDone(undefined, Schema.write(scenario));
        });
    });

};