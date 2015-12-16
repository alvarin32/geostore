var Crawler = require('./crawler');
var Elastic = require('elastic');
var Query = require('elastic/query');
var Geo = require('geometry');


var kaiserslautern = {
    left: 7.5303893089,
    right: 7.9720611572,
    top: 49.3561245199,
    bottom: 49.520666047
};

var klUni = {
    left: 7.7272,
    right: 7.7824,
    top: 49.4125,
    bottom: 49.4355
};


var test = function () {
    Elastic.createClient(function (error, client) {
        if (error) return console.error(error);

        client.get('node_288553862', function (error, node) {
            if (error) return console.error(error);
            var circle = Geo.Circle.create(node.location, 300);
            var nearby = {geo_shape: {location: {shape: circle.toGeoJson()}}};
            var wasteBasket = {term: {amenity: 'waste_basket'}};
            var query = Query.filtered({and: [nearby, wasteBasket]});
            client.search(query, function (error, results) {
                if (error) return console.error(error);
                console.log(results);
            })
        });

    })
};

Crawler.pullBox(klUni, function (error) {
    if (error) return console.error(error);
    test();
});
