var Elastic = require('elastic');
var Http = require('http');
var Xml2Js = require('xml2js');
var GeoTools = require('geometry/tools');
var Geo = require('geometry');

var stepSize = 0.05;
var BULK_SIZE = 500; //original 5000


//********************************************************************
//********************************************************************
//Schema:

var genericWrite = function(element){
    var body = {};
    for(key in element){
        if(key!='id' && key!='type'){
            body[key] = element[key];
        }
    }
    body.location = body.location.toGeoJson();
    return body;
};

var genericRead = function(type){
    return function(body, id){
        var element = {};
        for(var key in body){
            element[key] = body[key];
        }
        element.location = GeoTools.fromGeoJson(element.location);
        element.id = id;
        element.type = type;
        return element;
    };
};

var nodeType = {
    id : 'node',
    write : genericWrite,
    read: genericRead(nodeType)
};

var wayType = {
    id: 'way',
    write: genericWrite,
    read: genericRead(wayType)
};

Elastic.registerType(nodeType);
Elastic.registerType(wayType);



//********************************************************************
//********************************************************************
//Pulling tiles:

var start = function(box, client){
// We get the file from the web and we save them to Elasticsearch server
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
                if (error) return console.error(error);
                console.log("done. Parsing completed.")
                nodeCache = {};
                goOn();
            });
        });
    };

    var goOn = function () {
      // Procede part
        if (progress.left < box.right) {
            progress.left += stepSize;
        } else if (progress.top < box.bottom) {
            progress.left = box.left;
            progress.top += stepSize;
        } else {
            client.commitBulk();
            console.log("Box has been downloaded and saved to Elasticsearch.");
            return;
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
      //what happen if empty data are received?
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
        var tags = readTags(xml.tag || []);
        var id = 'node_' + attributes.id;
        var node = tags || {};
        node.id = id;
        node.type = nodeType;
        var longitude = parseFloat(attributes.lon);
        var latitude = parseFloat(attributes.lat);
        node.location = Geo.Point.create(longitude, latitude);
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
        var tags = readTags(xml.tag || []);
        var id = 'way_' + attributes.id;
        var way = tags || {};
        way.id = id;
        way.type = wayType;
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

    var getElement = function (id, onDone, roundTwo) {
      // Try to get an element from the elastic search engine
        var retry = function () {
            setTimeout(function () {
                getElement(id, onDone, roundTwo);
            }, 5000);
        };

        client.get(id, function (error, element) {
            if (error) {
                if (error.status == '404') {
                    if (roundTwo) return onDone();
                    client.commitBulk(function (error) {
                        if (error) return retry();
                        getElement(id, onDone, true);
                    })
                } else {
                    retry();
                }
                return;
            }
            return onDone(undefined, element);
        })
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

    var readTags = function (xml) {
        var tags = {};
        xml.forEach(function (xml) {
            var key = xml.$.k.toLowerCase().replace(/:/g, '_');
            tags[key] = xml.$.v;
        });
        return tags;
    }

    loadTile();
}


//********************************************************************
//********************************************************************
// Interface:

exports.pullBox = function(bbox){

    Elastic.createClient(undefined,    function(error, client){
        if(error) return console.error(error);
        start(bbox, client);
    });

};
