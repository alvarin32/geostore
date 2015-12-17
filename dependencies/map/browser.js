var Commons = require('commons');
var Artist = require('geometry/artist');
var MapTools = require('./tools');
var F = require('client/fiat');

var createLayer = function () {
    var layer = {};
    var width, height;
    var animationFrame;
    var geos = [];
    var scale = 0, offsetLeft = 0, offsetTop = 0;
    var context, artist;

    layer.initialize = function (map) {
        var raw = layer.canvas.raw();
        var box = layer.canvas.box();
        width = raw.width = box.width;
        height = raw.height = box.height;
        context = raw.getContext('2d');
        artist = Artist(context, {strong: 10, light: 2});
    };

    layer.add = function (geometry) {
        var geo = geometry.copy().transform(MapTools.mercator).backup();
        geo.origin = geometry;
        geos.push(geo);
        panAndZoom(geo);
        triggerRender();
    };

    layer.remove = function (geometry) {
        Commons.remove(geos, function (geo) {
            return geo.origin === geometry;
        });
        triggerRender();
    };

    layer.clear = function () {
        geos = [];
        triggerRender();
    };

    layer.update = function (map) {
        if (!map) return triggerRender();
        scale = map.getSize();
        offsetLeft = -map.getX() * scale;
        offsetTop = -map.getY() * scale;
        for (var i = 0; i < geos.length; i++) {
            panAndZoom(geos[i]);
        }
    };

    var panAndZoom = function (geo) {
        //revert previous changes:
        geo.restore();
        geo.backup();

        //zoom and pan:
        geo.scale(scale, scale);
        geo.translate(offsetLeft, offsetTop);
    };

    layer.render = function () {
        context.clearRect(0, 0, width, height);
        animationFrame = null;
        for (var i = 0; i < geos.length; i++) {
            var geo = geos[i];
            artist.setColor(geo.origin.color || '#303030');
            artist.draw(geo, false);
        }
    };

    var triggerRender = function () {
        animationFrame = animationFrame || window.requestAnimationFrame(layer.render);
    };

    return layer;
};


module.exports = {
    layer: createLayer
};