var Query = require('elastic/query');
var Scenario = require('../schema/scenario');
var Schema = require('elastic/schema');
var Log = require('./log');
var GeoTools = require('geometry/tools');
var Fs = require('fs');
var Path = require('path');
var Commons = require('commons');
var Way = require('../schema/way');
var Graph = require('./graph');
var Osm = require('./osm');

exports.start = function (application, configuration, global) {

    var database = application.database;
    var scenarioFolder = configuration.scenarios.folder;
    var listeners = Commons.MultiMap();

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
            Fs.mkdir(Path.join(scenarioFolder, scenario.id), function (error) {
                if (error) return onDone(['scenario', 'couldNotCreateFolder']);
                onDone(undefined, Schema.toWire(scenario));
            });
        });
    });

    application.ether.onNotification('scenarios/listen', function (scenarioId, client) {
        listeners.put(scenarioId, client);
        client.on('close', function () {
            listeners.remove(scenarioId, client);
        });
        var graphFile = Path.join(scenarioFolder, scenarioId, 'graph.json');
        if (Fs.existsSync(graphFile)) {
            var graph = JSON.parse(Fs.readFileSync(graphFile));
            client.notify('scenario/update', {type: 'graph', value: graph});
        }
    });

    application.ether.onNotification('scenarios/setName', function (parameter) {
        var newName = parameter.name;
        database.get(parameter.scenarioId, function (error, scenario) {
            if (error) return Log.error(error);
            scenario.name = newName;
            database.put(scenario, function (error) {
                if (error) return Log.error(error);
                spreadUpdate(scenario, 'name', newName);
            });
        });
    });

    application.ether.onNotification('scenarios/setGraph', function (parameter) {
        database.get(parameter.scenarioId, function (error, scenario) {
            if (error) return Log.error(error);
            var geometry = GeoTools.fromGeoJson(parameter.geometry);
            createAndStoreGraph(scenario, geometry, function (error, graph) {
                if (error) return Log.error(error);
                spreadUpdate(scenario, 'graph', graph);
                scenario.bounds = geometry.computeBoundingBox();
                database.put(scenario, function (error) {
                    if (error) return Log.error(error);
                    spreadUpdate(scenario, 'bounds', scenario.bounds.toGeoJson());
                });
            });
        });
    });

    var spreadUpdate = function (scenario, type, value) {
        var update = {type: type, value: value};
        listeners.forEach(scenario.id, function (client) {
            client.notify('scenario/update', update);
        });
    };

    var createAndStoreGraph = function (scenario, geometry, onDone) {
        loadNodesAndWays(geometry, function (error, nodes, ways) {
            if (error) return onDone(['scenario', 'couldNotLoadGraph']);
            var graph = Graph(nodes, ways).linearize();
            var asJson = graph.toJson();
            var graphFile = Path.join(scenarioFolder, scenario.id, 'graph.json');
            var writeStream = Fs.createWriteStream(graphFile);
            writeStream.write(JSON.stringify(asJson));
            writeStream.on('finish', onDone.bind(null, undefined, asJson));
            writeStream.on('error', onDone);
            writeStream.end();
        });
    };

    var loadNodesAndWays = function (geometry, onDone) {
        var ways = [];
        var nodes = {};
        var withinGeo = {geo_shape: {bounds: {shape: geometry.toGeoJson()}}};
        var isHighway = {nested: {path: 'tags', filter: {terms: {'tags.highway': Object.keys(Osm.highways)}}}};
        var query = Query.type(Way.type).filtered({and: [withinGeo, isHighway]});
        database.forEach(query, {
            onItem: function (way) {
                if (geometry.intersectsPath(way.geometry)) {
                    ways.push(way);
                    way.nodeIds.forEach(function (nodeId) {
                        nodes[nodeId] = true;
                    });
                }
            },
            onDone: function (error) {
                if (error) return onDone(error);
                database.mget(Object.keys(nodes), function (error, nodes) {
                    if (error) return onDone(error);
                    onDone(undefined, nodes, ways);
                });
            }
        });
    };

};