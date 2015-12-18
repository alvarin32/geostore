var Node = require('../schema/node');
var Colors = require('commons/colors');
var Designer = require('map/designer');
var Ajax = require('client/ajax');
var Geo = require('geometry');
var F = require('client/fiat');

exports.start = function (map) {

    var gap = 0.12;

    var box = F.node('div').style({
        position: 'fixed',
        left: cm(gap), top: cm(gap), bottom: cm(gap),
        borderRadius: cm(gap),
        padding: cm(gap),
        backgroundColor: colors.dark
    });

    var textArea = F.node('textarea').style({
        width: '100%', height: '100%',
        fontFamily: fonts.mono,
        borderRadius: cm(gap),
        border: 'none',
        resize: 'horizontal',
        padding: cm(gap)
    });

    var designer = Designer.layer();
    map.addLayer(designer);

    textArea.on('input', function () {
        triggerUpdate();
    });

    var timeout;
    var triggerUpdate = function () {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(doUpdate, 200);
    };

    var doUpdate = function () {
        var query = textArea.value();
        var idToNodeMap = extractAllIds(query);
        loadNodes(idToNodeMap, function (error) {
            if (error) return console.error(error);
            designer.clear();
            parseAndAddPaths(query, idToNodeMap, designer);
            parseAndAddNodes(query, idToNodeMap, designer);
        });
    };

    F.body.append(box.append(textArea));
};

var loadNodes = function (idToNodeMap, onDone) {
    var ids = getKeysOf(idToNodeMap);
    if (!ids.length) return onDone();
    Ajax.post('/api/nodes')
        .attach({ids: ids})
        .onFailure(onDone)
        .onSuccess(function (response) {
            response = JSON.parse(response);
            var nodes = response.nodes.map(Node.type.read);
            nodes.forEach(function (node) {
                var id = node.id.substr(5);
                idToNodeMap[id] = node;
            });
            return onDone();
        })
        .send();
};

var extractAllIds = function (query) {
    query = query.replace(/[^0-9]/g, ',');
    var parts = query.split(',');
    var result = {};
    parts.forEach(function (part) {
        if (part && part.length) result[part] = true;
    });
    return result;
};

var parseAndAddPaths = function (query, idToNodeMap, designer) {
    var matches = query.match(/\[[^\[\]]+\]/g);
    if (!matches)return;
    matches.forEach(function (match) {
        var ids = match.replace(/[^0-9]/g, ',').split(',').filter(nonEmpty);
        if (!ids || ids.length < 2) return;
        var path = Geo.Path.create();
        ids.forEach(function (id) {
            path.lineTo(idToNodeMap[id].location);
        });
        addColorHandlers(path, designer);
        designer.addGeometry(path);
    });
};

var parseAndAddNodes = function (query, idToNodeMap, designer) {
    var ids = query.replace(/\[[^\[\]]+\]/g, '').replace(/[^0-9]/g, ',').split(',').filter(nonEmpty);
    ids.forEach(function (id) {
        var point = idToNodeMap[id].location;
        addColorHandlers(point, designer);
        designer.addGeometry(point);
    });
};

var getKeysOf = function (object) {
    var array = [];
    for (var key in object) {
        array.push(key);
    }
    return array;
};

var nonEmpty = function (value) {
    return value && value.length;
};


var addColorHandlers = function (element, designer) {
    var backup;
    element.color = '#303030';

    element.onOver = function () {
        backup = element.color;
        element.color = '#ffaa55';
        designer.triggerUpdate();
    };

    element.onOut = function () {
        element.color = backup;
        designer.triggerUpdate();
    };

    element.onTap = function () {
        backup = Colors.random();
        element.color = backup;
        designer.triggerUpdate();
    };
};