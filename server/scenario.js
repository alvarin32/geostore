var Query = require('elastic/query');
var Scenario = require('../schema/scenario');
var Schema = require('elastic/schema');
var Log = require('./log');

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
                onDone(undefined, scenarios.map(Schema.toWire));
            }
        });
    });

    application.ether.onCall('scenarios/create', function (parameter, client, onDone) {
        var scenario = Scenario.type.create(client.user);
        database.put(scenario, function (error) {
            if (error) return onDone(['scenario', 'couldNotCreateScenario']);
            onDone(undefined, Schema.toWire(scenario));
        });
    });

    application.ether.onNotification('scenarios/setName', function (parameter) {
        database.get(parameter.scenarioId, function (error, scenario) {
            if (error) return Log.error(error);
            scenario.name = parameter.name;
            database.put(scenario, function (error) {
                if (error) return Log.error(error);
                scenario = Schema.toWire(scenario);
                application.ether.forEach(function (client) {
                    client.notify('scenario/update/' + scenario.id, scenario);
                });
            })
        });
    });

};