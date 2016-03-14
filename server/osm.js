var OsmRead = require('osm-read');
var Geo = require('geometry');
var MapTools = require('map/tools');
var Log = require('./log');

var Node = require('../schema/node');
var Way = require('../schema/way');
var Relation = require('../schema/relation');

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

exports.createParser = function (database, boundingBox) {

    var parse = function (filePath, onProgress, onDone) {
        var tracker = createProgressTracker(boundingBox, onProgress);
        parsePbf(filePath, tracker.scaled(0.5), function (error, elements) {
            if (error) return onDone(['osm', 'couldNotParsePbf']);
            writeInChunks(elements, tracker.scaled(0.5), function (error) {
                if (error) return onDone(['osm', 'couldNotPersistOsmData']);
                onProgress(1);
                onDone();
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

    var parsePbf = function (filePath, tracker, onDone) {

        var outOfBounds = {};
        var elements = {};
        var elementCount = 0;
        var addElement = function (element) {
            elements[element.id] = element;
            elementCount++;
            tracker.update(1);
            return element;
        };

        var onNode = function ($node) {
            if (boundingBox.contains($node.lon, $node.lat)) {
                parseNode($node);
            } else {
                outOfBounds['node_' + $node.id] = $node;
            }
        };

        var parseNode = function ($node) {
            var id = 'node_' + $node.id;
            var location = [$node.lon, $node.lat];
            var node = Node.type.create(id, location);
            if ($node.tags) {
                node.tags = cleanTags($node);
                if (node.tags) {
                    node.name = nameFromTags(node.tags);
                }
            }
            return addElement(node);
        };

        var onWayGeoReady = function ($way, geometry, nodeIds) {
            var id = 'way_' + $way.id;
            var way = Way.type.create(id);
            if ($way.tags) {
                way.tags = cleanTags($way);
                if (way.tags) {
                    way.name = nameFromTags(way.tags);
                }
            }
            way.nodeIds = nodeIds;
            way.geometry = geometry;
            return addElement(way);
        };

        var getFromOutOfBounds = function (elementId, parse) {
            var element = outOfBounds[elementId];
            if (element) {
                delete outOfBounds[elementId];
                return parse(element);
            }
            return elements[elementId];
        };

        var forceParseWay = function ($way) {
            var nodeIds = [];
            var path = [];
            $way.nodeRefs.forEach(function (nodeId) {
                nodeId = 'node_' + nodeId;
                nodeIds.push(nodeId);
                var node = elements[nodeId];
                if (!node) node = getFromOutOfBounds(nodeId, parseNode);
                path.push(node.location);
            });
            var geometry = createWayGeo(path, nodeIds, $way.tags);
            return onWayGeoReady($way, geometry, nodeIds);
        };

        var tryToParseWay = function ($way) {
            var nodeIds = [];
            var path = [];
            var missing = [];
            $way.nodeRefs.forEach(function (nodeId, index) {
                nodeId = 'node_' + nodeId;
                nodeIds.push(nodeId);
                var node = elements[nodeId];
                if (!node) return missing.push(index);
                path[index] = node.location;
            });
            if (missing.length == nodeIds.length) return (outOfBounds['way_' + $way.id] = $way);
            missing.forEach(function (index) {
                var nodeId = nodeIds[index];
                var node = getFromOutOfBounds(nodeId, parseNode);
                path[index] = node.location;
            });
            var geometry = createWayGeo(path, nodeIds, $way.tags);
            onWayGeoReady($way, geometry, nodeIds);
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

        var onRelationMembersReady = function ($relation) {
            var id = 'relation_' + $relation.id;
            var relation = Relation.type.create(id);
            if ($relation.tags) {
                relation.tags = cleanTags($relation);
                if (relation.tags) {
                    relation.name = nameFromTags(relation.tags);
                }
            }
            relation.members = $relation.members;
            return addElement(relation);
        };

        var tryToparseRelation = function ($relation) {
            var hasActiveMember = $relation.members.some(function (member) {
                var id = member.type + '_' + member.ref;
                return (id in elements);
            });

            if (hasActiveMember) return forceParseRelation($relation);
            (outOfBounds['relation_' + $relation.id] = $relation);
        };

        var forceParseRelation = function ($relation) {
            $relation.members.forEach(function (member) {
                var type = member.type;
                var id = type + '_' + member.ref;
                var element = elements[id];
                if (element) return;
                var parseFunction = getParseFunction(type);
                getFromOutOfBounds(id, parseFunction);
            });
            return onRelationMembersReady($relation);
        };

        var getParseFunction = function (type) {
            if (type == 'node') return parseNode;
            if (type == 'way') return forceParseWay;
            return forceParseRelation;
        };


        OsmRead.parsePbf({
            filePath: filePath,
            node: onNode,
            way: tryToParseWay,
            relation: tryToparseRelation,
            error: Log.error,
            endDocument: function () {
                tracker.actual(elementCount);
                onDone(undefined, elements);
            }
        });

    };

    return {parse: parse};
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

