var Gui = require('client/gui');
var Keys = require('../keys');
var Schema = require('elastic/schema');
var Geo = require('geometry');
var Colors = require('commons/colors');

module.exports = function (context) {

    var ether = context.application.ether;
    var constructor = context.stage.map.constructor;
    var scenario = context.scenario;

    var iconColor = '#4FE59D';

    var startCreationTool = function () {
        var icon = Gui.createIcon('/images/graph/create.svg', {color: iconColor});
        icon.style({width: cm(1), height: cm(1)});
        icon.on('click', function () {
            context.stage.menu.hide();
            var cancel = constructor.polygon(function (polygon) {
                escapeListener.stop();
                ether.notify('scenarios/setGraph',
                    {scenarioId: scenario.id, geometry: polygon.toGeoJson()});
            });
            var escapeListener = Keys.once(27, cancel);
            return false;
        });
        context.stage.menu.append(icon);
    };

    var start = function () {
        startCreationTool();
        //selection-tool (sinks+sources)
    };

    var stop = function () {
        //TODO
    };

    var linkGraph = function (graph) {
        var vertexMap = {};
        graph.vertices.forEach(function (vertex) {
            vertexMap[vertex.id] = vertex;
        });
        graph.edges.forEach(function (edge) {
            edge.start = vertexMap[edge.start];
            edge.stop = vertexMap[edge.stop];
        });
    };

    context.scenario.on('graph', function (newGraph) {
        linkGraph(newGraph);
        var geos = context.stage.map.geos;
        geos.clear();
        newGraph.edges.forEach(function (edge) {
            var geometry = geoFromEdge(edge);
            geos.addGeo(geometry);
        });
        /*newGraph.vertices.forEach(function (vertex) {
         var geometry = geoFromVertex(vertex);
         geos.addGeo(geometry);
         });*/
    });

    var geoFromVertex = function (vertex) {
        var location = Geo.Point.fromArray(vertex.location);
        location.style = {fillColor: colors.bright};
        location.gestures = {
            onOver: function () {
                location.style.fillColor = colors.signal;
            },
            onOut: function () {
                location.style.fillColor = colors.bright;
            }
        };
        return location;
    };

    var geoFromEdge = function (edge) {
        var path = Geo.Path.fromArray(edge.path);
        path.style = {strokeColor: colors.dark};
        path.style.hideNodes = true;
        path.gestures = {
            onOver: function () {
                path.style.strokeColor = colors.signal;
            },
            onOut: function () {
                path.style.strokeColor = colors.dark;
            },
            onTap: function () {
                console.log(edge);
            }
        };
        return path;
    };

    return {start: start, stop: stop};
};