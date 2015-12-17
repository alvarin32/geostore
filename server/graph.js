var GeoTools = require('geometry/tools');
var Query = require('elastic/query');

module.exports = function (app) {

    var client = app._client;
    
    app.post('/api/graph', function (request, response, next) {
        var geometry = GeoTools.fromGeoJson(request.body);
        var intersects = {geo_shape: {shape: geometry.toGeoJson()}};
        var isRoad = {};
        var query = Query.filtered({and:[intersects, isRoad]});
        
        client.count(query, function(error, count){
            if(error || count>5000) return next(error || 'too much elements');
            client.forEach(query, {
                onItem: function(item){},
                onDone: function(error){}
            });    
        });
        

    });
};

/*
* 
* function (error, hits) {
 if(error) return next(error);
 //TODO: generate graph from all the roads that intersect geometry and send it back
 var graph = null;
 response.send({graph: graph});
 }
 
* */
