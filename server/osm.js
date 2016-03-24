var OsmRead = require('osm-read');
var Geo = require('geometry');
var MapTools = require('map/tools');
var Log = require('./log');
var Query = require('elastic/query');
var Schema = require('elastic/schema');
var OsmState = require('../schema/osm_state');

var Node = require('../schema/node');
var Way = require('../schema/way');
var Relation = require('../schema/relation');

exports.start = function (application) {
    application.ether.onCall('main/state', function (parameter, client, onDone) {
        application.database.search(Query.type(OsmState.type), function (error, result) {
            if (error || !result.hits.length) return onDone(['scenarios', 'couldNotReadOsmStatus']);
            onDone(undefined, Schema.toWire(result.hits[0]));
        });
    });
};

exports.parseBounds = function (filePath, onDone) {
    var maxLat = Number.MIN_VALUE;
    var minLat = Number.MAX_VALUE;
    var maxLon = Number.MIN_VALUE;
    var minLon = Number.MAX_VALUE;
    OsmRead.parsePbf({
        filePath: filePath,
        node: function (node) {
            maxLat = Math.max(maxLat, node.lat);
            minLat = Math.min(minLat, node.lat);
            maxLon = Math.max(maxLon, node.lon);
            minLon = Math.min(minLon, node.lon);
        },
        error: onDone,
        endDocument: function () {
            var bounds = Geo.Box.create(
                Geo.Point.create(minLon, minLat),
                Geo.Point.create(maxLon, maxLat)
            );
            onDone(undefined, bounds);
        }
    });
};

exports.createParser = function (filePath, database, boundingBox) {

    var parse = function (onProgress, onDone) {
        var tracker = createProgressTracker(onProgress).scaled(0.33);
        markElements(tracker, function (error, markedElements, numberOfMarks) {
            if (error) return onDone(['osm', 'couldNotMarkElements']);
            tracker.actual(numberOfMarks);
            parseElements(tracker, markedElements, function (error, elements) {
                if (error) return onDone(['osm', 'couldNotParseElements']);
                markedElements = null;
                writeInChunks(elements, tracker, function (error) {
                    if (error) return onDone(['osm', 'couldNotStoreElements']);
                    onProgress(1);
                    onDone();
                });
            });
        });
    };

    var createProgressTracker = function (boundingBox, onProgress) {
        var planeBox = boundingBox.copy().transform(MapTools.mercator);
        var size = planeBox.getWidth() * planeBox.getHeight();
        var estimation = Math.round(size * 2059667400000);
        var done = 0;
        var scale = 1;
        var lastUpdate = 0;
        var tracker = {};
        tracker.actual = function (total) {
            console.log('estimated: ' + estimation + ' actual: ' + total);
            estimation = total;
        };
        tracker.update = function (numberOfItems) {
            numberOfItems = numberOfItems || 1;
            done += (scale * numberOfItems);
            var progress = Math.min(1, (done / estimation));
            if ((progress - lastUpdate) > 0.01) {
                onProgress(progress);
                lastUpdate = progress;
            }
        };
        tracker.scaled = function ($scale) {
            scale = $scale;
            return tracker;
        };
        return tracker;
    };

    var maxChunkSize = 1000;
    var writeInChunks = function (elements, tracker, onDone) {
        var chunkSize = 0;
        var toDelete = [];
        for (var id in elements) {
            toDelete.push(id);
            database.putBulk(elements[id]);
            if (++chunkSize >= maxChunkSize) break;
        }
        if (!chunkSize) return onDone();
        toDelete.forEach(function (id) {
            delete elements[id];
        });
        database.commitBulk(function (error) {
            if (error) return onDone(error);
            tracker.update(chunkSize);
            writeInChunks(elements, tracker, onDone);
        });
    };


    var markElements = function (tracker, onDone) {
        var marked = {};
        var marksCount = 0;
        var markElement = function (id) {
            marked[id] = true;
            marksCount++;
            tracker.update(1);
        };
        var isMarked = function (id) {
            return id in marked;
        };
        var markIfNotMarked = function (id) {
            if (id in marked) return;
            markElement(id);
        };

        var onNode = function (node) {
            if (boundingBox.contains(node.lon, node.lat)) markElement('node_' + node.id);
        };

        var onWay = function (way) {
            var nodeIds = way.nodeRefs.map(function (ref) {
                return 'node_' + ref;
            });
            if (nodeIds.some(isMarked)) {
                markElement('way_' + way.id);
                nodeIds.forEach(markIfNotMarked)
            }
        };

        var onRelation = function (relation) {
            var memberIds = relation.members.map(function (member) {
                return member.type + '_' + member.ref;
            });
            if (memberIds.every(isMarked)) {
                markElement('relation_' + relation.id);
            }
        };

        OsmRead.parsePbf({
            filePath: filePath,
            node: onNode,
            way: onWay,
            relation: onRelation,
            error: Log.error,
            endDocument: function () {
                onDone(undefined, marked, marksCount);
            }
        });
    };

    var parseElements = function (tracker, marked, onDone) {

        var elements = {};

        var onNode = function ($node) {
            var id = 'node_' + $node.id;
            if (!(id in marked)) return;
            var location = [$node.lon, $node.lat];
            var node = Node.type.create(id, location);
            if ($node.tags) {
                node.tags = cleanTags($node);
                if (node.tags) {
                    node.name = nameFromTags(node.tags);
                }
            }
            elements[id] = node;
            tracker.update(1);
        };

        var onWay = function ($way) {
            var id = 'way_' + $way.id;
            if (!(id in marked)) return;
            parseWay($way, function (nodeIds, geometry) {
                var way = Way.type.create(id);
                if ($way.tags) {
                    way.tags = cleanTags($way);
                    if (way.tags) {
                        way.name = nameFromTags(way.tags);
                    }
                }
                way.nodeIds = nodeIds;
                way.geometry = geometry;
                elements[id] = way;
                tracker.update(1);
            });
        };

        var parseWay = function ($way, onDone) {
            var nodeIds = [];
            var path = [];
            $way.nodeRefs.forEach(function (ref) {
                var nodeId = 'node_' + ref;
                nodeIds.push(nodeId);
                var node = elements[nodeId];
                if (!node || !node.location) {
                    console.log('could not find node ' + nodeId + ' of way ' + $way.id);
                }
                path.push(elements[nodeId].location);
            });
            var geometry = createWayGeo(path, nodeIds, $way.tags);
            onDone(nodeIds, geometry);
        };

        var createWayGeo = function (pathArray, nodeIds, tags) {
            var geo = Geo.Path.fromArray(pathArray);
            if (describesSurface(nodeIds, tags)) {
                geo = Geo.Polygon.create().addPath(geo.close());
            }
            return geo;
        };

        var describesSurface = function (nodeIds, tags) {
            return nodeIds[0] == nodeIds[nodeIds.length - 1]
                && (!tags || !tags.highway);
        };

        var onRelation = function ($relation) {
            var id = 'relation_' + $relation.id;
            if (!(id in marked)) return;
            var relation = Relation.type.create(id);
            if ($relation.tags) {
                relation.tags = cleanTags($relation);
                if (relation.tags) {
                    relation.name = nameFromTags(relation.tags);
                }
            }
            relation.members = $relation.members;
            elements[id] = relation;
            tracker.update(1);
        };

        OsmRead.parsePbf({
            filePath: filePath,
            node: onNode,
            way: onWay,
            relation: onRelation,
            error: Log.error,
            endDocument: function () {
                onDone(undefined, elements);
            }
        });

    };


    return {parse: parse};
};

exports.highways = {
    motorway: {speed: 100, capacity: 10},
    motorway_link: {speed: 50, capacity: 10},
    trunk: {speed: 100, capacity: 10},
    trunk_link: {speed: 50, capacity: 10},
    primary: {speed: 80, capacity: 9},
    primary_link: {speed: 50, capacity: 9},
    secondary: {speed: 80, capacity: 8},
    secondary_link: {speed: 50, capacity: 8},
    tertiary: {speed: 80, capacity: 7},
    tertiary_link: {speed: 50, capacity: 7},
    unclassified: {speed: 70, capacity: 6},
    residential: {speed: 30, capacity: 5},
    living_street: {speed: 10, capacity: 4}
};

var cleanTags = function (element) {
    var old = element.tags;
    var result = {};
    var count = 0;
    for (var key in old) {
        var newKey = key.replace(/[^a-zA-Z0-9]/g, '_');
        result[newKey] = old[key];
        count++;
    }
    return count ? result : undefined;
};


var nameFromTags = function (tags) {
    var names = [];
    if (tags.name) names.push(tags.name);
    names = names.concat(parseAddresses(tags));
    if (!names.length) return;
    if (names.length == 1) return names[0];
    return names;
};

var parseAddresses = function (tags) {
    var addresses = [];
    if (tags.addr_street) {
        var address = createAddress(tags.addr_street);
        if (tags.addr_city) address.city = tags.addr_city;
        var zipCode = tags.addr_postcode || tags.addr_postal_code;
        if (zipCode) address.zipCode = zipCode;
        if (tags.addr_housenumber) {
            var numbers = parseHouseNumbers(tags.addr_housenumber);
            for (var i = 0; i < numbers.length; i++) {
                address.number = numbers[i];
                addresses.push(address.toString());
            }
        }
    }
    return addresses;
};

var createAddress = function (street) {
    var address = {street: street};
    address.toString = function () {
        var result = address.street;
        if (address.number) result += (' ' + address.number);
        var city = (address.zipCode + ' ' + address.city).trim();
        if (city) result += (', ' + city);
        return result;
    };
    return address;
};

var parseHouseNumbers = function (string) {
    var numbers = [];
    string.split(',').forEach(function (part) {
        try {
            if (part.length) numbers.push(part.trim());
        } catch (exception) {
            console.log('could not parse number: ' + part);
        }
    });
    return numbers;
};

