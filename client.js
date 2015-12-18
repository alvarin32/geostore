var F = require('client/fiat');
var I18n = require('client/i18n');
var Map = require('map');
var Tiles = require('map/tiles');
var GeoTools = require('geometry/tools');
var Browser = require('./client/browser');


I18n.initialize(function (error) {
    if (error) return console.error(error);
    F.onReady(function () {

        var map = Map.create();
        var tiles = Tiles.layer(Tiles.providers.MAPQUEST);
        map.addLayer(tiles);

        map.container.onAttached(function () {
            var kulmbach = GeoTools.fromGeoJson({
                "type": "Envelope",
                "coordinates": [[11.274513045933933, 50.064726311348174], [11.636284907126422, 50.133499050947165]]
            });
            var kaiserslautern = GeoTools.fromGeoJson({
                "type": "Envelope",
                "coordinates": [[7.663104262751075, 49.420316720969126], [7.871519041616732, 49.46372382507342]]
            });
            map.goToGeo(kaiserslautern);
        });

        F.body.append(map.container.style({
            width: '100%',
            height: '100%'
        }));

        Browser.start(map);
    });
});