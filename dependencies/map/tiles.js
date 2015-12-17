var Map = require('./map');
var F = require('client/fiat');
var Commons = require('commons');
var Animator = require('client/animation');
var MapTools = require('./tools');
var Geo = require('geometry');
var Artist = require('geometry/artist');

var createLayer = function (provider) {

    var layer = {}, map;
    var tileCache;
    var leaves = [];
    var leafSize = 0;
    var renderFrame;

    layer.setProvider = function ($provider) {
        provider = $provider;
        if (layer.context) {
            var cacheSize = (Math.max(layer.width, layer.height) / provider.tileSize);
            cacheSize = Math.round(Math.pow(cacheSize, 4));
            tileCache = createTileCache(cacheSize, provider, triggerRender);
        }
    };

    layer.initialize = function ($map) {
        layer.setProvider(provider);
        map = $map;
    };

    layer.update = function () {
        tileCache.onUpdateStart();
        doUpdate();
        tileCache.onUpdateStop();
    };

    var doUpdate = function () {
        var mapSize = map.getSize();
        var numberOfTiles = Math.ceil(mapSize / provider.tileSize);
        var z = Math.round(Math.log(numberOfTiles) / Math.log(2));
        z = Math.min(provider.max, Math.max(provider.min, z));
        numberOfTiles = 1 << z;
        leafSize = mapSize / numberOfTiles;
        var left = map.getX() * mapSize;
        var top = map.getY() * mapSize;
        var x = Math.floor(left / leafSize);
        var y = Math.floor(top / leafSize);
        var leavesX = Math.ceil(layer.width / leafSize) + 1;
        var leavesY = Math.ceil(layer.height / leafSize) + 1;
        leavesX = Math.min(leavesX, numberOfTiles - x);
        leavesY = Math.min(leavesY, numberOfTiles - y);
        prepareLeaves(leavesX * leavesY);
        for (var i = 0; i < leavesX; i++) {
            for (var j = 0; j < leavesY; j++) {
                var leaf = leaves[i * leavesY + j];
                leaf.update(
                    (x + i) * leafSize - left,
                    (y + j) * leafSize - top,
                    tileCache.get(x + i, y + j, z));
            }
        }
    };

    var prepareLeaves = function (numberOfLeaves) {
        while (leaves.length > numberOfLeaves) {
            leaves.pop();
        }
        while (leaves.length < numberOfLeaves) {
            leaves.push(newLeaf());
        }
    };

    var newLeaf = function () {
        var leaf = {left: 0, top: 0, tile: null};
        leaf.update = function (left, top, tile) {
            leaf.left = left;
            leaf.top = top;
            leaf.tile = tile;
        };
        return leaf;
    };


    var triggerRender = function () {
        renderFrame = renderFrame || window.requestAnimationFrame(layer.render);
    };

    layer.render = function () {
        renderFrame = null;
        layer.context.clearRect(0, 0, layer.width, layer.height);
        tileCache.onDrawStart();
        for (var i = 0; i < leaves.length; i++) {
            var leaf = leaves[i];
            var tile = leaf.tile;
            tile.draw(layer.context, leaf.left, leaf.top, leafSize, false);
        }
        tileCache.onDrawStop();
    };


    layer.clearCache = function () {
        tileCache.clear();
    };

    return layer;
};

var providers = {
    MAPQUEST: {
        tileSize: 256,
        getUrl: function (x, y, z) {
            var serverIndex = Math.round(Math.random() * 3 + 1);
            return 'http://otile' + serverIndex + '.mqcdn.com/tiles/1.0.0/osm/'
                + z + '/' + x + '/' + y + '.jpg';
        },
        min: 1,
        max: 19
    },
    GOOGLE: {
        tileSize: 256,
        getUrl: function (x, y, z) {
            var serverIndex = Math.round(Math.random() * 2 + 1);
            var layerId = 'm@169000000';
            var locale = 'de';
            return 'http://mt' + serverIndex + '.google.com/vt/lyrs='
                + layerId + '&hl=' + locale + '&x=' + x + '&y=' + y + '&z=' + z + '&s=Galileo';
        },
        min: 1,
        max: 20
    },
    DSS: (function () {
        var token = 1;
        return {
            tileSize: 256,
            getUrl: function (x, y, z) {
                return '/tiles/' + x + '/' + y + '/' + z + '&' + token;
            },
            min: 1,
            max: 20,
            clear: function () {
                token++;
            }
        }
    })()
};


var LEVELS_UP = 2;

var createTileCache = function (size, provider, onUpdate) {
    var lruCache = Commons.LruCache(size);
    var tileCache = {};
    tileCache.clear = function () {
        lruCache = Commons.LruCache(size);
    };
    tileCache.onUpdateStart = function () {
        lruCache.forEach(setUnpinned);
    };
    tileCache.get = function (x, y, z) {
        var id = idToString(x, y, z);
        var tile = lruCache.get(id);
        if (!tile) {
            tile = createTile(x, y, z, provider);
            cacheParents(tile, LEVELS_UP);
            lruCache.put(id, tile, false);
        }
        pinTileAndParents(tile, LEVELS_UP);
        return tile;
    };
    tileCache.onUpdateStop = function () {
        lruCache.shrink();
    };
    lruCache.onDismiss = function (id, tile) {
        tile.cancel();
    };
    tileCache.onDrawStart = function () {
        lruCache.forEach(markAsNotDrawn);
    };
    tileCache.onDrawStop = function () {
        lruCache.forEach(cancelNotDrawn);
    };

    var cacheParents = function (tile, levels) {
        var z = tile.z;
        var x = tile.x;
        var y = tile.y;
        if (z > 0 && levels > 0 && !tile.parent) {
            z--;
            x = Math.floor(x / 2);
            y = Math.floor(y / 2);
            var id = idToString(x, y, z);
            var parent = lruCache.getSilently(id);
            if (!parent) {
                parent = createTile(x, y, z, provider);
                lruCache.put(id, parent, false);
            }
            tile.parent = parent;
            cacheParents(parent, levels - 1);
        }
    };

    var pinTileAndParents = function (tile, levels) {
        if (tile.pinned) return;
        tile.pinned = true;
        if (tile.parent && levels) {
            pinTileAndParents(tile.parent, levels - 1);
        }
    };

    var setUnpinned = function (element) {
        var tile = element.value;
        tile.pinned = false;
    };

    var markAsNotDrawn = function (element) {
        var tile = element.value;
        tile.drawn = false;
    };

    var cancelNotDrawn = function (element) {
        var tile = element.value;
        if (!tile.drawn) {
            tile.cancel();
        }
    };

    var createTile = function (x, y, z, provider) {
        var tile = {x: x, y: y, z: z, alpha: 0};
        var size = provider.tileSize;

        var drawImage = function (context, left, top, leafSize) {
            context.drawImage(tile.image,
                0, 0, size, size,
                left, top, leafSize, leafSize);
        };

        var draw = function (context, left, top, leafSize, asParent, depth) {
            tile.drawn = !asParent || tile.image;
            if (!tile.image) {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(loadImage, 100);
            }
            if (tile.alpha >= 1) {
                drawImage(context, left, top, leafSize);
            } else if (!asParent) {
                if (tile.parent) drawParent(context, left, top, leafSize);
                if (tile.alpha > 0) drawWithAlpha(context, left, top, leafSize);
            } else if (tile.alpha > 0) {
                drawImage(context, left, top, leafSize);
            } else if (tile.parent && depth) {
                drawParent(context, left, top, leafSize, depth - 1);
            }
        };


        var drawParent = function (context, left, top, leafSize, depth) {
            context.save();
            context.beginPath();
            context.rect(left, top, leafSize, leafSize);
            context.clip();
            var offsetX = (tile.x % 2 == 1) ? leafSize : 0;
            var offsetY = (tile.y % 2 == 1) ? leafSize : 0;
            tile.parent.draw(context,
                left - offsetX, top - offsetY,
                leafSize * 2, leafSize * 2,
                true, depth);
            context.restore();
        };

        var drawWithAlpha = function (context, left, top, leafSize) {
            var alpha = context.globalAlpha;
            context.globalAlpha = alpha * tile.alpha;
            drawImage(context, left, top, leafSize);
            context.globalAlpha = alpha;
        };

        var loadImage = function () {
            timeout = null;
            tile.image = new Image();
            tile.image.onload = function () {
                tile.ready = true;
                Animator.start({
                    from: 0, to: 1, onTick: function (value) {
                        tile.alpha = value;
                        onUpdate();
                    }
                });
            };
            tile.image.src = provider.getUrl(x, y, z);
        };

        var timeout;
        tile.draw = function (context, left, top, leafSize, asParent) {
            draw(context, left, top, leafSize, asParent, LEVELS_UP);
        };

        tile.cancel = function () {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                return true;
            }
        };

        return tile;
    };

    return tileCache;
};

var idToString = function (x, y, z) {
    return x + '_' + y + '_' + z;
};


var MIN_SCALE = (1 / (1 << 16)) / 256;
var createImage = function (options) {
    options = options || {};
    var geo;

    var setGeo = function (geometry, transformed) {
        if (!geometry) {
            transformed = true;
            geometry = Geo.Box.create(Geo.Point.create(0, 0), Geo.Point.create(1, 1));
        }
        if (!transformed) geometry = geometry.copy().transform(MapTools.mercator);
        geo = geometry;
    };

    setGeo(options.geo, options['transformed']);
    var offset = options.offset || 1; //[cm]
    var provider = options['provider'] || providers.MAPQUEST;
    var container = F.node('div').style('position', 'relative');
    var canvasStyle = {position: 'absolute', left: 0, top: 0, height: '100%', width: '100%'};
    var tileCanvas = F.node('canvas').style(canvasStyle);
    var geoCanvas = F.node('canvas').style(canvasStyle);
    container.append(tileCanvas, geoCanvas);
    var width, height, tileContext, geoContext;
    var artist;

    var render = function () {
        tileContext.clearRect(0, 0, width, height);
        geoContext.clearRect(0, 0, width, height);
        var box = Geo.Box.empty();
        geo.computeBoundingBox(box);
        var scaleX = box.getWidth() / (width - cmToPx(offset));
        var scaleY = box.getHeight() / (height - cmToPx(offset));
        var excerpt = {};
        excerpt.scale = Math.max(scaleX, scaleY);   // [%/px]
        if (excerpt.scale <= 0) excerpt.scale = MIN_SCALE;
        excerpt.width = width * excerpt.scale;
        excerpt.height = height * excerpt.scale;
        excerpt.size = Math.min(excerpt.width, excerpt.height);
        excerpt.x = box.getLeft() - ((excerpt.width - box.getWidth()) / 2);
        excerpt.y = box.getTop() - ((excerpt.height - box.getHeight()) / 2);
        boundExcerpt(excerpt);
        renderTiles(excerpt);
        if (!options.hideGeo) renderGeo(excerpt);
    };

    var boundValue = function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    };

    var boundExcerpt = function (excerpt) {
        excerpt.x = boundValue(excerpt.x, 0, 1);
        excerpt.y = boundValue(excerpt.y, 0, 1);
        excerpt.width = Math.min(1 - excerpt.x, excerpt.width);
        excerpt.height = Math.min(1 - excerpt.y, excerpt.height);
        excerpt.size = Math.min(1 - excerpt.x, Math.min(1 - excerpt.y, excerpt.size));
        excerpt.scale = excerpt.size / Math.min(width, height);
    };

    var renderTiles = function (excerpt) {
        var numberOfShownTiles = 1;
        var zoom = Math.floor(Math.log(numberOfShownTiles / excerpt.size) / Math.log(2));
        zoom = Math.min(provider.max, Math.max(provider.min, zoom));
        var tilesAtZoom = Math.pow(2, zoom);
        var tileSizeAtZoom = 1 / tilesAtZoom;
        numberOfShownTiles = Math.ceil(excerpt.size / tileSizeAtZoom) + 1;
        var startX = Math.floor(excerpt.x / tileSizeAtZoom);
        var startY = Math.floor(excerpt.y / tileSizeAtZoom);
        for (var i = 0; i < numberOfShownTiles; i++) {
            for (var j = 0; j < numberOfShownTiles; j++) {
                var id = {x: startX + i, y: startY + j, z: zoom};
                if (id.x < tilesAtZoom && id.y < tilesAtZoom) {
                    loadAndRenderTile(id, excerpt, tileSizeAtZoom);
                }
            }
        }
    };

    var renderGeo = function (excerpt) {
        geo.backup();
        var scale = 1 / excerpt.scale;
        geo.translate(-excerpt.x, -excerpt.y);
        geo.scale(scale, scale);
        artist.draw(geo);
        geo.restore();
    };

    var loadAndRenderTile = function (id, excerpt, tileSize) {
        var image = new Image();
        var _myGeo = geo;
        image.onload = function () {
            if (_myGeo != geo) return;
            var left = (id.x * tileSize - excerpt.x) / excerpt.scale;
            var top = (id.y * tileSize - excerpt.y) / excerpt.scale;
            var size = tileSize / excerpt.scale;
            tileContext.drawImage(image, 0, 0, 256, 256, left, top, size, size);
        };
        image.src = provider.getUrl(id.x, id.y, id.z);
    };

    container.onAttached(function () {
        tileContext = prepareCanvas(tileCanvas);
        geoContext = prepareCanvas(geoCanvas);
        artist = Artist(geoContext, options.artist);
        render();
    });

    var prepareCanvas = function (canvas) {
        var raw = canvas.raw();
        var box = canvas.box();
        width = raw.width = box.width;
        height = raw.height = box.height;
        return raw.getContext('2d');
    };

    container.update = function (geometry, transformed) {
        setGeo(geometry, transformed);
        if (artist)render();
    };

    return container;
};


module.exports = {
    layer: createLayer,
    image: createImage,
    providers: providers
};