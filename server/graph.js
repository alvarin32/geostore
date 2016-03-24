var MapTools = require('map/tools');
var Log = require('./log');
var Osm = require('./osm');
var Commons = require('commons');

module.exports = function (nodes, ways) {
    var nextId = 1;
    var edges = [];
    var vertices = [];

    var nodeToVertexMap = {};

    var createVertex = function (node) {
        var vertex = {id: nextId++, location: node.location.asArray(), in: [], out: []};
        nodeToVertexMap[node.id] = vertex;
        vertices.push(vertex);
    };

    var createEdges = function (way) {
        var nodeIds = way.nodeIds;
        var capacity = computeCapacity(way);
        var speed = computeSpeed(way);
        if (!speed) {
            console.log(computeSpeed(way));
        }
        for (var i = 1; i < nodeIds.length; i++) {
            var start = nodeToVertexMap[nodeIds[i - 1]];
            var stop = nodeToVertexMap[nodeIds[i]];
            var length = computeDistance(start, stop);
            var duration = length * (1 / (speed * 0.28));
            var edge = {
                id: nextId++,
                path: [start.location, stop.location],
                start: start, stop: stop,
                length: length,
                capacity: capacity,
                duration: duration
            };
            start.out.push(edge);
            stop.in.push(edge);
            edges.push(edge);
        }
    };

    var computeDistance = function (start, stop) {
        var from = start.location;
        var to = stop.location;
        return MapTools.computeDistance(from[1], from[0], to[1], to[0]);
    };

    var computeCapacity = function (way) {
        var wayType = way.tags.highway;
        var capacity = Osm.highways[wayType].capacity;
        if (way.tags.lanes) capacity *= parseInt(way.tags.lanes);
        return capacity;
    };

    var computeSpeed = function (way) {
        var maxspeed = way.tags.maxspeed;
        if (maxspeed) maxspeed = parseInt(maxspeed);
        if (!maxspeed) {
            var wayType = way.tags.highway;
            return Osm.highways[wayType].speed;
        }
        return maxspeed;
    };

    nodes.forEach(createVertex);
    ways.forEach(createEdges);
    var graph = {vertices: vertices, edges: edges, nextId: nextId};
    return defineInterface(graph);
};

var defineInterface = function (graph) {

    var _ = {};

    _.linearize = function () {
        var verticesToDelete = [];
        graph.vertices = graph.vertices.filter(function (vertex) {
            if (vertex.in.length != 1 || vertex.out.length != 1) return true;
            if (vertex.in[0].capacity != vertex.out[0].capacity) return true;
            verticesToDelete.push(vertex);
            return false;
        });
        var edgesToDelete = {};
        var newEdges = [];
        verticesToDelete.forEach(function (vertex) {
            var _in = vertex.in[0];
            var _out = vertex.out[0];
            var newEdge = {
                id: graph.nextId++, start: _in.start, stop: _out.stop,
                path: _in.path.concat(_out.path),
                length: _in.length + _out.length,
                capacity: _in.capacity,
                duration: _in.duration + _out.duration
            };
            Commons.removeElement(_in.start.out, _in);
            Commons.removeElement(_out.stop.in, _out);
            _in.start.out.push(newEdge);
            _out.stop.in.push(newEdge);
            newEdges.push(newEdge);
            edgesToDelete[_in.id] = true;
            edgesToDelete[_out.id] = true;
        });
        graph.edges = graph.edges.concat(newEdges).filter(function (edge) {
            return !(edge.id in edgesToDelete);
        });
        return _;
    };

    _.toJson = function () {
        var vertices = graph.vertices.map(function (vertex) {
            return {id: vertex.id, location: vertex.location};
        });
        var edges = graph.edges.map(function (edge) {
            return {
                id: edge.id,
                start: edge.start.id, stop: edge.stop.id,
                length: edge.length,
                capacity: edge.capacity,
                duration: edge.duration,
                path: edge.path
            }
        });
        return {vertices: vertices, edges: edges};
    };

    return _;
};


