var Elastic = require('elastic');
var Http = require('http');
var Xml2Js = require('xml2js');
var Geo = require('geometry');
var Node = require('./schema/node');
var Way = require('./schema/way');

var stepSize = 0.05;
var BULK_SIZE = 5000;


var start = function (box, client, onDone) {

    var nodeCache = {};
    var progress = {left: box.left, top: box.top};

    var loadTile = function () {
        var right = progress.left + stepSize;
        var bottom = progress.top + stepSize;
        var path = '/cgi/map?bbox='
            + progress.left + ',' + progress.top + ','
            + right + ',' + bottom;
        console.log('loading ' + path);
        Http.get({
            host: 'overpass.osm.rambler.ru',
            path: path
        }, function (response) {
            parse(response, function (error) {
                if (error) return onDone(error);
                nodeCache = {};
                goOn();
            });
        });
    };

    var goOn = function () {
        if (progress.left < box.right) {
            progress.left += stepSize;
        } else if (progress.top < box.bottom) {
            progress.left = box.left;
            progress.top += stepSize;
        } else {
            return client.commitBulk(function (error) {
                if (error) return onDone(error);
                return onDone();
            });
        }
        process.nextTick(loadTile);
    };

    var parse = function (stream, onDone) {
        console.log('got answer. parsing xml...');
        streamToString(stream, function (error, string) {
            if (error) return onDone(error);
            Xml2Js.parseString(string, function (error, result) {
                if (error) return onDone(error);
                console.log('done. parsing osm-structure...');
                parseXml(result, onDone);
            });
        })
    };

    var streamToString = function (stream, onDone) {
        var string = '';
        stream.on('error', onDone);
        stream.on('data', function (data) {
            string += data.toString();
        });
        stream.on('end', function () {
            onDone(undefined, string);
        });
    };

    var parseXml = function (xml, onDone) {
        var osm = xml.osm;
        parseArray(osm.node, parseNode, function (error) {
            if (error) return onDone(error);
            client.commitBulk(function (error) {
                if (error) return onDone(error);
                parseArray(osm.way, parseWay, function (error) {
                    onDone(error);
                });
            });
        });
    };

    var parseArray = function (array, itemParser, onDone) {
        if (!array.length) return onDone();
        var item = array.pop();
        itemParser(item, function (error) {
            if (error) return onDone(error);
            parseArray(array, itemParser, onDone);
        });
    };

    var parseNode = function (xml, onDone) {
        var attributes = xml.$;
        var id = 'node_' + attributes.id;
        var longitude = parseFloat(attributes.lon);
        var latitude = parseFloat(attributes.lat);
        var location = Geo.Point.create(longitude, latitude);
        var node = Node.type.create(id, location);
        attachTags(node, xml);
        setNames(node);
        nodeCache[id] = node;
        if (client.putBulk(node) > BULK_SIZE) {
            client.commitBulk(onDone);
        } else {
            process.nextTick(onDone);
        }
    };

    var parseWay = function (xml, onDone) {
        var attributes = xml.$;
        var id = 'way_' + attributes.id;
        var way = Way.type.create(id);
        attachTags(way, xml);
        setNames(way);
        createWayGeo(xml.nd, function (error, geometry) {
            if (error) return onDone(error);
            way.location = geometry;
            if (client.putBulk(way) > BULK_SIZE) {
                client.commitBulk(onDone);
            } else {
                process.nextTick(onDone);
            }
        });
    };

    var createWayGeo = function (nodes, onDone, path) {
        path = path || Geo.Path.create();
        if (!nodes.length) {
            if (path.isClosed()) {
                path = Geo.Polygon.create().addPath(path);
            }
            return onDone(undefined, path);
        }
        var nodeId = 'node_' + nodes.pop().$.ref;
        var node = nodeCache[nodeId];
        path.lineTo(node.location);
        createWayGeo(nodes, onDone, path);
    };

    var setNames = function (element) {
        var names = [];
        if (element.name) names.push(element.name);
        names = names.concat(parseAddresses(element));
        if (!names.length) return;
        if (names.length == 1) return (element.name = names[0]);
        element.name = names;
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

    var attachTags = function (atom, xml) {
        var tags = (xml.tag || []);
        tags.forEach(function (tag) {
            var key = tag.$.k.toLowerCase().replace(/:/g, '_');
            if (key != 'id' && key != 'type') {
                atom[key] = tag.$.v;
            }
        });
    };


    loadTile();

};


//********************************************************************
//********************************************************************
// Interface:

require('./bootstrap');

exports.pullBox = function (bbox, onDone) {

    Elastic.createClient(function (error, client) {
        if (error) return onDone(error);
        start(bbox, client, onDone);
    });

};

exports.testQuery = function (id) {

    console.log('testing the database...');
    Elastic.createClient(function (error, client) {
        if (error) return console.log(error);
        client.get(id, function (error, node) {
            if (error) return console.log(error);
            console.log(node);
        });
    });

};