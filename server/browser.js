var Schema = require('elastic/schema');

module.exports = function (app) {

    var client = app._client;

    app.post('/api/nodes', function (request, response, next) {
        
        if (!request.body || !request.body.ids) return next('no ids given.');
        getNodes(request.body.ids, function (error, nodes) {
            if (error) return next(error);
            nodes = nodes.map(Schema.toWire);
            response.send({nodes: nodes});
        })
    });

    var getNodes = function (ids, onDone, result) {
        result = result || [];
        if (!ids.length) return onDone(undefined, result);
        var id = 'node_' + ids.pop();
        client.get(id, function (error, node) {
            if (error) return onDone('could not get node ' + id + ' (' + error + ')');
            result.push(node);
            getNodes(ids, onDone, result);
        });
    };
};